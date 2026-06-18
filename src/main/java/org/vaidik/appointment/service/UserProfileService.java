package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.ChangePasswordRequest;
import org.vaidik.appointment.dto.UpdateProfileRequest;
import org.vaidik.appointment.dto.UserProfileDTO;
import org.vaidik.appointment.entity.AuthProvider;
import org.vaidik.appointment.entity.Role;
import org.vaidik.appointment.entity.User;
import org.vaidik.appointment.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private static final String PASSWORD_POLICY_REGEX =
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserProfileDTO getProfile(String email) {
        User user = findByEmail(email);
        return toDTO(user);
    }

    public UserProfileDTO updateProfile(String email, UpdateProfileRequest request) {
        User user = findByEmail(email);

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName());
        }
        user.setPhone(request.getPhone());
        user.setAddress(request.getAddress());

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            user.setEmail(request.getEmail());
        }

        if (request.getRole() != null && !request.getRole().isBlank()) {
            user.setRole(Role.valueOf(request.getRole()));
        }

        userRepository.save(user);
        return toDTO(user);
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
}