package org.vaidik.appointment.service;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final OtpRepository otpRepository;
    private final EmailService emailService;
    private final RefreshTokenService refreshTokenService;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private static final Set<Role> ALLOWED_SELF_ASSIGN_ROLES = Set.of(
            Role.CUSTOMER, Role.BUSINESS_OWNER
    );

    public record RefreshTokenRotationResult(String accessToken, String newRefreshTokenValue) {}

    public String register(RegisterRequest request) {

        if (request.getRole() == Role.SUPER_ADMIN) {
            throw new RuntimeException("Invalid role selection.");
        }
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();
        userRepository.save(user);
        return "User registered successfully";
    }

    public AuthResponse login(LoginRequest request, HttpServletResponse response) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isDeleted()) {
            throw new RuntimeException("This account has been deactivated. Please contact support.");
        }

        if (user.getProvider() == AuthProvider.GOOGLE) {
            throw new RuntimeException("This account uses Google Sign-In. Please use 'Continue with Google' to login.");
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        String accessToken = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getName(), user.getProvider() != null ? user.getProvider().name() : "LOCAL");

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
        setRefreshTokenCookie(response, refreshToken.getToken());

        return new AuthResponse(accessToken, user.getName(), user.getEmail(), user.getRole().name());
    }

    public ResponseEntity<?> completeProfile(CompleteProfileRequest request, HttpServletResponse response) {
        Role role;
        try {
            role = Role.valueOf(request.getRole());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid role."));
        }
        if (!ALLOWED_SELF_ASSIGN_ROLES.contains(role)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid role selection."));
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setRole(role);
        userRepository.save(user);

        String accessToken = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getName(), user.getProvider() != null ? user.getProvider().name() : "LOCAL");

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
        setRefreshTokenCookie(response, refreshToken.getToken());

        return ResponseEntity.ok(Map.of("token", accessToken));
    }

    public RefreshTokenRotationResult refreshAccessToken(String oldRefreshTokenValue) {
        RefreshToken newRefreshToken = refreshTokenService.rotateRefreshToken(oldRefreshTokenValue);
        User user = newRefreshToken.getUser();

        if (user.isDeleted()) {
            throw new RuntimeException("This account has been deactivated. Please contact support.");
        }

        String newAccessToken = jwtUtil.generateToken(
                user.getEmail(), user.getRole().name(), user.getName(),
                user.getProvider() != null ? user.getProvider().name() : "LOCAL"
        );
        return new RefreshTokenRotationResult(newAccessToken, newRefreshToken.getToken());
    }

    @Transactional
    public void logout(String refreshTokenValue, HttpServletResponse response) {
        if (refreshTokenValue != null) {
            try {
                RefreshToken rt = refreshTokenService.findByToken(refreshTokenValue);
                refreshTokenService.deleteByUser(rt.getUser());
            } catch (RuntimeException e) {
                System.err.println("Logout: refresh token not found in DB (may be already expired): " + e.getMessage());
            }
        }
        clearRefreshTokenCookie(response);
    }

    // ── Cookie helpers ──────────────────────────────────────────────
    public void setRefreshTokenCookie(HttpServletResponse response, String token) {
        String cookieValue = String.format(
                "refreshToken=%s; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=%d",
                token,
                7 * 24 * 60 * 60  // 7 days
        );
        response.addHeader("Set-Cookie", cookieValue);
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        String cookieValue = "refreshToken=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0";
        response.addHeader("Set-Cookie", cookieValue);
    }

    // ── OTP / Password Reset ────────────────────────────────────────
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
        otpEntity.setVerified(false);
        otpRepository.save(otpEntity);
        emailService.sendOtpEmail(email, otp);
        return "OTP_SENT";
    }

    /**
     * Verifies the OTP and marks it as verified in the DB so that resetPassword
     * can confirm it was actually validated (prevents skipping the OTP step).
     */
    public boolean verifyOtp(String email, String otp) {
        Optional<Otp> optionalOtp = otpRepository.findByEmail(email);
        if (optionalOtp.isEmpty()) return false;
        Otp savedOtp = optionalOtp.get();

        boolean otpMatches = constantTimeEquals(savedOtp.getOtp(), otp);
        boolean notExpired  = !savedOtp.getExpiryTime().isBefore(LocalDateTime.now());
        if (otpMatches && notExpired) {
            savedOtp.setVerified(true);
            otpRepository.save(savedOtp);
            return true;
        }
        return false;
    }

    @Transactional
    public void resetPassword(String email, String newPassword) {
        // [SECURITY] Ensure OTP was actually verified before allowing password reset.
        // Without this check anyone who knows a user's email can call /reset-password
        // directly, bypassing the OTP step entirely.
        Otp otpRecord = otpRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("OTP verification required before resetting password."));

        if (!otpRecord.isVerified()) {
            throw new RuntimeException("Please verify your OTP before resetting your password.");
        }
        if (otpRecord.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP session has expired. Please request a new OTP.");
        }

        User user = userRepository.findByEmail(email).orElseThrow();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        otpRepository.deleteByEmail(email);
    }

    /** Constant-time string comparison to prevent timing-based OTP enumeration. */
    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}