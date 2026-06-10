package org.vaidik.appointment.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.dto.AuthResponse;
import org.vaidik.appointment.dto.CompleteProfileRequest;
import org.vaidik.appointment.dto.LoginRequest;
import org.vaidik.appointment.dto.RegisterRequest;
import org.vaidik.appointment.entity.AuthProvider;
import org.vaidik.appointment.entity.Otp;
import org.vaidik.appointment.entity.RefreshToken;
import org.vaidik.appointment.entity.Role;
import org.vaidik.appointment.entity.User;
import org.vaidik.appointment.repository.OtpRepository;
import org.vaidik.appointment.repository.UserRepository;
import org.vaidik.appointment.security.JwtUtil;
import java.security.SecureRandom;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final OtpRepository otpRepository;
    private final EmailService emailService;
    private final RefreshTokenService refreshTokenService; // ← NEW

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public record RefreshTokenRotationResult(String accessToken, String newRefreshTokenValue) {}

    public String register(RegisterRequest request) {
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();
        userRepository.save(user);
        return "User registered successfully";
    }

    // ← MODIFIED: now accepts HttpServletResponse to set cookie
    public AuthResponse login(LoginRequest request, HttpServletResponse response) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getProvider() == AuthProvider.GOOGLE) {
            throw new RuntimeException("This account uses Google Sign-In. Please use 'Continue with Google' to login.");
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        // Access token (short-lived, goes in response body)
        String accessToken = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getName());

        // Refresh token (long-lived, goes in HttpOnly cookie)
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
        setRefreshTokenCookie(response, refreshToken.getToken());

        return new AuthResponse(accessToken, user.getName(), user.getEmail(), user.getRole().name());
    }

    // ← MODIFIED: same pattern for completeProfile
    public ResponseEntity<?> completeProfile(CompleteProfileRequest request, HttpServletResponse response) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setRole(Role.valueOf(request.getRole()));
        userRepository.save(user);

        String accessToken = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getName());

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
        setRefreshTokenCookie(response, refreshToken.getToken());

        return ResponseEntity.ok(Map.of("token", accessToken));
    }

    public RefreshTokenRotationResult refreshAccessToken(String oldRefreshTokenValue) {
        RefreshToken newRefreshToken = refreshTokenService.rotateRefreshToken(oldRefreshTokenValue);
        User user = newRefreshToken.getUser();
        String newAccessToken = jwtUtil.generateToken(
                user.getEmail(), user.getRole().name(), user.getName()
        );
        return new RefreshTokenRotationResult(newAccessToken, newRefreshToken.getToken());
    }

//    // ← NEW: logout clears cookie + deletes refresh token from DB
//    @Transactional
//    public void logout(String refreshTokenValue, HttpServletResponse response) {
//        if (refreshTokenValue != null) {
//            refreshTokenRepository_findByToken_andDelete(refreshTokenValue);
//        }
//        clearRefreshTokenCookie(response);
//    }

    @Transactional
    public void logout(String refreshTokenValue, HttpServletResponse response) {
        if (refreshTokenValue != null) {
            try {
                RefreshToken rt = refreshTokenService.findByToken(refreshTokenValue);
                refreshTokenService.deleteByUser(rt.getUser());
            } catch (RuntimeException e) {
                // Token not found or already expired — still clear the cookie
                // Log it but don't silently swallow without clearing cookie
                System.err.println("Logout: refresh token not found in DB (may be already expired): " + e.getMessage());
            }
        }
        clearRefreshTokenCookie(response);
    }

    // ── Cookie helpers ──────────────────────────────────────────────
    public void setRefreshTokenCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie("refreshToken", token);
        cookie.setHttpOnly(true);       // JS cannot read this
        cookie.setSecure(false);        // set true in production (HTTPS)
        cookie.setPath("/api/auth");    // only sent to auth endpoints
        cookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        response.addCookie(cookie);
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie("refreshToken", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/api/auth");
        cookie.setMaxAge(0); // delete immediately
        response.addCookie(cookie);
    }

//    private void refreshTokenRepository_findByToken_andDelete(String token) {
//        try {
//            RefreshToken rt = refreshTokenService.findByToken(token);
//            refreshTokenService.deleteByUser(rt.getUser());
//        } catch (Exception ignored) {}
//    }

    // ── Remaining methods unchanged ─────────────────────────────────
    public String sendOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getProvider() != null && user.getProvider() == AuthProvider.GOOGLE) {
            return "GOOGLE_ACCOUNT";
        }

        String otp = String.valueOf(100000 + SECURE_RANDOM.nextInt(900000));
        Otp otpEntity = otpRepository.findByEmail(email).orElse(new Otp());
        otpEntity.setEmail(email);
        otpEntity.setOtp(otp);
        otpEntity.setExpiryTime(LocalDateTime.now().plusMinutes(10));
        otpRepository.save(otpEntity);
        emailService.sendOtpEmail(email, otp);
        return "OTP_SENT";
    }

    public boolean verifyOtp(String email, String otp) {
        Optional<Otp> optionalOtp = otpRepository.findByEmail(email);
        if (optionalOtp.isEmpty()) return false;
        Otp savedOtp = optionalOtp.get();
        if (!savedOtp.getOtp().equals(otp)) return false;
        return !savedOtp.getExpiryTime().isBefore(LocalDateTime.now());
    }

    @Transactional
    public void resetPassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email).orElseThrow();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        otpRepository.deleteByEmail(email);
    }
}