package org.vaidik.appointment.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.vaidik.appointment.entity.AuthProvider;
import org.vaidik.appointment.entity.Role;
import org.vaidik.appointment.entity.User;
import org.vaidik.appointment.repository.UserRepository;
import org.vaidik.appointment.security.JwtUtil;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String name  = oAuth2User.getAttribute("name");

        Optional<User> existing = userRepository.findByEmail(email);
        System.out.println("Found user: " + existing.isPresent());
        if (existing.isPresent()) {
            System.out.println("Provider: " + existing.get().getProvider());
        }

        // ── Existing LOCAL user tried Google ──
        if (existing.isPresent() && existing.get().getProvider() == AuthProvider.LOCAL) {
            response.sendRedirect("http://localhost:5173/login?error=use_password");
            return;
        }

        // ── Existing GOOGLE user → just login ──
        if (existing.isPresent()) {
            User user = existing.get();
            String token = jwtUtil.generateToken(
                    user.getEmail(),
                    user.getRole().name(),
                    user.getName()
            );
            response.sendRedirect("http://localhost:5173/oauth2/callback?token=" + token);
            return;
        }

        // ── Brand NEW Google user → ask role first ──
        // Save a temporary incomplete user with no role
        User newUser = User.builder()
                .email(email)
                .name(name)
                .provider(AuthProvider.GOOGLE)
                .password(null)
                .role(null)  // ← role not set yet, make Role nullable in entity
                .build();
        userRepository.save(newUser);

        // Redirect to role selection page with email as param
        response.sendRedirect(
                "http://localhost:5173/complete-profile?email="
                        + URLEncoder.encode(email, StandardCharsets.UTF_8)
                        + "&name=" + URLEncoder.encode(name, StandardCharsets.UTF_8)
        );
    }
}