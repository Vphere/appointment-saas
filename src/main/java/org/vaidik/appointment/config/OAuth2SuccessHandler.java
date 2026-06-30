package org.vaidik.appointment.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.vaidik.appointment.entity.AuthProvider;
import org.vaidik.appointment.entity.User;
import org.vaidik.appointment.repository.UserRepository;
import org.vaidik.appointment.security.JwtUtil;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @Value("${app.frontend.url}")
    private List<String> frontendUrls;

    private String primaryFrontendUrl() {
        return (frontendUrls != null && !frontendUrls.isEmpty())
                ? frontendUrls.get(0)
                : "";
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String name  = oAuth2User.getAttribute("name");

        Optional<User> existing = userRepository.findByEmail(email);

        String frontendUrl = primaryFrontendUrl();

        // ── Deactivated (soft-deleted) account → block login entirely ──
        if (existing.isPresent() && existing.get().isDeleted()) {
            response.sendRedirect(frontendUrl + "/login?error=account_deactivated");
            return;
        }

        // ── Existing LOCAL user tried Google ──
        if (existing.isPresent() && existing.get().getProvider() == AuthProvider.LOCAL) {
            response.sendRedirect(frontendUrl + "/login?error=use_password");
            return;
        }

        // ── Existing GOOGLE user → just login ──
        if (existing.isPresent()) {
            User user = existing.get();
            // Role can be null if user quit before completing the role-selection step.
            // Send them back to complete-profile so they can pick a role.
            if (user.getRole() == null) {
                response.sendRedirect(
                        frontendUrl + "/complete-profile?email="
                                + URLEncoder.encode(email, StandardCharsets.UTF_8)
                                + "&name=" + URLEncoder.encode(user.getName() != null ? user.getName() : "",
                                    StandardCharsets.UTF_8)
                );
                return;
            }
            String token = jwtUtil.generateToken(
                    user.getEmail(),
                    user.getRole().name(),
                    user.getName(),
                    "GOOGLE"
            );
            response.sendRedirect(frontendUrl + "/oauth2/callback?token=" + token);
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
                frontendUrl + "/complete-profile?email="
                        + URLEncoder.encode(email, StandardCharsets.UTF_8)
                        + "&name=" + URLEncoder.encode(name, StandardCharsets.UTF_8)
        );
    }
}