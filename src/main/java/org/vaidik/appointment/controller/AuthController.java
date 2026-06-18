package org.vaidik.appointment.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.AuthResponse;
import org.vaidik.appointment.dto.CompleteProfileRequest;
import org.vaidik.appointment.dto.LoginRequest;
import org.vaidik.appointment.dto.RefreshTokenResponse;
import org.vaidik.appointment.dto.RegisterRequest;
import org.vaidik.appointment.service.AuthService;

import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            String result = authService.register(request);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletResponse response) {
        try {
            AuthResponse authResponse = authService.login(request, response);
            return ResponseEntity.ok(authResponse);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request, HttpServletResponse response) {
        String oldRefreshToken = extractRefreshTokenFromCookie(request);
        if (oldRefreshToken == null) {
            return ResponseEntity.status(401).body(Map.of("message", "No refresh token"));
        }
        try {
            AuthService.RefreshTokenRotationResult result = authService.refreshAccessToken(oldRefreshToken);
            authService.setRefreshTokenCookie(response, result.newRefreshTokenValue());
            return ResponseEntity.ok(new RefreshTokenResponse(result.accessToken()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = extractRefreshTokenFromCookie(request);
        if (refreshToken != null) {
            authService.logout(refreshToken, response);
        }
        clearRefreshTokenCookie(response);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/complete-profile")
    public ResponseEntity<?> completeProfile(@RequestBody CompleteProfileRequest request,
                                             HttpServletResponse response) {
        return authService.completeProfile(request, response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestParam String email) {
        String result = authService.sendOtp(email);
        if ("GOOGLE_ACCOUNT".equals(result)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "This account was created using Google Sign-In. Please continue with Google Sign-In."));
        }
        return ResponseEntity.ok(Map.of("message", "OTP sent successfully"));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp   = body.get("otp");
        try {
            boolean valid = authService.verifyOtp(email, otp);
            if (!valid) return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired OTP"));
            return ResponseEntity.ok(Map.of("message", "OTP verified"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String email       = body.get("email");
        String newPassword = body.get("newPassword");

        // Validate password policy server-side even on reset
        if (newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Password must be at least 8 characters"));
        }
        if (!newPassword.matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"));
        }

        try {
            authService.resetPassword(email, newPassword);
            return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────────────

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> "refreshToken".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie("refreshToken", "");
        cookie.setMaxAge(0);
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        response.addCookie(cookie);
    }
}