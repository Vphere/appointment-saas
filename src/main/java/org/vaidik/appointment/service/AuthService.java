package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.vaidik.appointment.dto.AuthResponse;
import org.vaidik.appointment.dto.CompleteProfileRequest;
import org.vaidik.appointment.dto.LoginRequest;
import org.vaidik.appointment.dto.RegisterRequest;
import org.vaidik.appointment.entity.AuthProvider;
import org.vaidik.appointment.entity.Otp;
import org.vaidik.appointment.entity.Role;
import org.vaidik.appointment.entity.User;
import org.vaidik.appointment.repository.OtpRepository;
import org.vaidik.appointment.repository.UserRepository;
import org.vaidik.appointment.security.JwtUtil;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final OtpRepository otpRepository;
    private final EmailService emailService;

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

    public AuthResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getProvider() == AuthProvider.GOOGLE) {
            throw new RuntimeException("This account uses Google Sign-In. Please use 'Continue with Google' to login.");
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getRole().name(),
                user.getName()
        );

        // Return token + name + email + role so frontend doesn't need to decode JWT
        return new AuthResponse(
                token,
                user.getName(),
                user.getEmail(),
                user.getRole().name()
        );
    }

    public ResponseEntity<?> completeProfile( CompleteProfileRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Assign role
        user.setRole(Role.valueOf(request.getRole()));
        userRepository.save(user);

        // Generate JWT now that role is set
        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getRole().name(),
                user.getName()
        );

        return ResponseEntity.ok(Map.of("token", token));
    }

    public String sendOtp(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        // Google account check
        if (user.getProvider() != null
                && user.getProvider() == AuthProvider.GOOGLE) {

            return "GOOGLE_ACCOUNT";
        }

        String otp = String.valueOf(
                100000 + new Random().nextInt(900000)
        );

        Otp otpEntity = otpRepository.findByEmail(email)
                .orElse(new Otp());

        otpEntity.setEmail(email);
        otpEntity.setOtp(otp);

        otpEntity.setExpiryTime(
                LocalDateTime.now().plusMinutes(5)
        );

        otpRepository.save(otpEntity);

        emailService.sendOtpEmail(email, otp);

        return "OTP_SENT";
    }

    public boolean verifyOtp(String email, String otp) {

        Optional<Otp> optionalOtp = otpRepository.findByEmail(email);

        if (optionalOtp.isEmpty()) {
            return false;
        }

        Otp savedOtp = optionalOtp.get();

        if (!savedOtp.getOtp().equals(otp)) {
            return false;
        }

        return !savedOtp.getExpiryTime().isBefore(LocalDateTime.now());
    }

    @Transactional
    public void resetPassword(String email, String newPassword) {

        User user = userRepository.findByEmail(email)
                    .orElseThrow();

        user.setPassword(passwordEncoder.encode(newPassword));

        userRepository.save(user);

        otpRepository.deleteByEmail(email);
    }
}