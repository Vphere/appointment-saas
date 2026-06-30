package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.ChangePasswordRequest;
import org.vaidik.appointment.dto.UpdateProfileRequest;
import org.vaidik.appointment.dto.UpdateProfileResponse;
import org.vaidik.appointment.dto.UserProfileDTO;
import org.vaidik.appointment.entity.AuthProvider;
import org.vaidik.appointment.entity.Role;
import org.vaidik.appointment.entity.User;
import org.vaidik.appointment.repository.UserRepository;
import org.vaidik.appointment.security.JwtUtil;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private static final String PASSWORD_POLICY_REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$";
    private static final String EMAIL_REGEX  = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";
    private static final String PHONE_REGEX  = "^\\+?[\\d\\s\\-().]{7,15}$";

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil         jwtUtil;

    public UserProfileDTO getProfile(String email) {
        return toDTO(findByEmail(email));
    }

    public UpdateProfileResponse updateProfile(String currentEmail, UpdateProfileRequest request) {
        User user = findByEmail(currentEmail);

        // ── Name ─────────────────────────────────────────────────────────────
        if (request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("Full name cannot be empty.");
        }
        user.setName(request.getName().trim());

        // ── Email ─────────────────────────────────────────────────────────────
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email address cannot be empty.");
        }
        String newEmail = request.getEmail().trim();
        if (!newEmail.matches(EMAIL_REGEX)) {
            throw new IllegalArgumentException(
                    "Invalid email address. Please enter a valid email (e.g. user@example.com).");
        }

        boolean emailChanged = !newEmail.equalsIgnoreCase(currentEmail);

        // Guard: new email must not already be taken by another account
        if (emailChanged) {
            userRepository.findByEmail(newEmail).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) {
                    throw new IllegalArgumentException(
                            "That email address is already registered to another account.");
                }
            });
        }

        user.setEmail(newEmail);

        // ── Phone (optional but validated when provided) ──────────────────────
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            String phone = request.getPhone().trim();
            if (phone.matches(".*[a-zA-Z].*")) {
                throw new IllegalArgumentException(
                        "Phone number cannot contain letters. Please enter digits only.");
            }
            if (!phone.matches(PHONE_REGEX)) {
                throw new IllegalArgumentException(
                        "Invalid phone number. Enter 7–15 digits, optionally starting with '+'.");
            }
            user.setPhone(phone);
        } else {
            user.setPhone(request.getPhone());
        }

        user.setAddress(request.getAddress());

        if (request.getRole() != null && !request.getRole().isBlank()) {
            try {
                user.setRole(Role.valueOf(request.getRole()));
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Invalid role: " + request.getRole());
            }
        }

        userRepository.save(user);

        // ── Mint a new access token if the email changed ──────────────────────
        String newToken = null;
        if (emailChanged) {
            newToken = jwtUtil.generateToken(
                    user.getEmail(),
                    user.getRole().name(),
                    user.getName(),
                    user.getProvider() != null ? user.getProvider().name() : "LOCAL"
            );
        }

        return toUpdateResponse(user, newToken);
    }

    public void changePassword(String email, ChangePasswordRequest request) {
        User user = findByEmail(email);

        if (user.getProvider() != AuthProvider.LOCAL) {
            throw new IllegalStateException("Password change is not available for OAuth accounts.");
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Incorrect current password.");
        }

        String newPwd = request.getNewPassword();
        if (newPwd == null || newPwd.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters.");
        }
        if (!newPwd.matches(PASSWORD_POLICY_REGEX)) {
            throw new IllegalArgumentException(
                    "Password must contain at least one uppercase letter, one lowercase letter, " +
                            "one digit, and one special character.");
        }

        user.setPassword(passwordEncoder.encode(newPwd));
        userRepository.save(user);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    private UserProfileDTO toDTO(User user) {
        return UserProfileDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .address(user.getAddress())
                .role(user.getRole().name())
                .provider(user.getProvider().name())
                .build();
    }

    private UpdateProfileResponse toUpdateResponse(User user, String newToken) {
        return UpdateProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .address(user.getAddress())
                .role(user.getRole().name())
                .provider(user.getProvider().name())
                .newToken(newToken)   // null when email unchanged; frontend checks for this
                .build();
    }
}