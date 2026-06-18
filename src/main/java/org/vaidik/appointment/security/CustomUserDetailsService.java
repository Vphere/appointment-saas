package org.vaidik.appointment.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.entity.User;
import org.vaidik.appointment.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // Google OAuth users have null role until they complete profile
        String role = user.getRole() != null ? user.getRole().name() : "INCOMPLETE";

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword() != null ? user.getPassword() : "{noop}oauth_user")
                .authorities("ROLE_" + role)
                // Deactivated (soft-deleted) accounts cannot authenticate.
                .disabled(user.isDeleted())
                .build();
    }
}