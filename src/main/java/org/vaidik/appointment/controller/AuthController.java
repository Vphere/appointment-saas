package org.vaidik.appointment.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
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
    public String register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    // ← MODIFIED: inject HttpServletResponse
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

            // Write the NEW refresh token cookie — old one is already deleted in DB
            authService.setRefreshTokenCookie(response, result.newRefreshTokenValue());

            return ResponseEntity.ok(new RefreshTokenResponse(result.accessToken()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        }
    }

    // ← NEW: logout
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = extractRefreshTokenFromCookie(request);
        authService.logout(refreshToken, response);

        HttpSession session = request.getSession(false); // false = don't create new one
        if (session != null) {
            session.invalidate();
        }

        // ← ADD THIS — explicitly clear JSESSIONID cookie
        Cookie jsessionCookie = new Cookie("JSESSIONID", "");
        jsessionCookie.setMaxAge(0);
        jsessionCookie.setPath("/");
        jsessionCookie.setHttpOnly(true);
        response.addCookie(jsessionCookie);

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
        if (result.equals("GOOGLE_ACCOUNT")) {
            return ResponseEntity.badRequest()
                    .body("This account was created using Google Sign-In. Please continue with Google Sign-In.");
        }
        return ResponseEntity.ok("OTP sent successfully");
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestParam String email, @RequestParam String otp) {
        boolean isValid = authService.verifyOtp(email, otp);
        if (!isValid) return ResponseEntity.badRequest().body("Invalid or expired OTP");
        return ResponseEntity.ok("OTP verified");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestParam String email, @RequestParam String newPassword) {
        authService.resetPassword(email, newPassword);
        return ResponseEntity.ok("Password updated successfully");
    }

    // ── Helper ──────────────────────────────────────────────────────
    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> "refreshToken".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}