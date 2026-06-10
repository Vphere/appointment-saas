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
            user.setRole(Role.valueOf(request.getRole())); // import your Role enum
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
        if (request.getNewPassword() == null || request.getNewPassword().length() < 4) {
            throw new IllegalArgumentException("New password must be at least 4 characters.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
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