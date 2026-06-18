package org.vaidik.appointment.config;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.vaidik.appointment.security.JwtAuthenticationFilter;
import org.vaidik.appointment.security.RateLimitingFilter;
import org.springframework.web.cors.*;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@RequiredArgsConstructor
@EnableMethodSecurity
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;

    @Value("${app.frontend.url}")
    private List<String> frontendUrl;

    @Value("${app.cors.allowed-methods}")
    private List<String> allowedMethods;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())

                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                        })
                )

                .authorizeHttpRequests(auth -> auth
                        // AUTH
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/register",
                                "/api/auth/refresh",
                                "/api/auth/logout",
                                "/api/auth/forgot-password",
                                "/api/auth/verify-otp",
                                "/api/auth/reset-password",
                                "/api/auth/complete-profile",
                                "/oauth2/**",
                                "/login/**"
                        ).permitAll()

                        // SERVICES
                        .requestMatchers(HttpMethod.GET, "/api/services").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/services/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.PUT, "/api/services/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.DELETE, "/api/services/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.GET, "/api/services/**").permitAll()

                        // BUSINESS
                        .requestMatchers(HttpMethod.POST, "/api/business").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.GET, "/api/business/my").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.GET, "/api/business/analytics").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.GET, "/api/business/all").hasRole("SUPER_ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/business/pending").hasRole("SUPER_ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/business/*/delete-preflight").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.GET, "/api/business/approved").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/business").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/business/**").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/business/*/resubmit").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.PUT, "/api/business/*/approve").hasRole("SUPER_ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/business/*/reject").hasRole("SUPER_ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/business/*/request-delete").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.POST, "/api/business/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.DELETE, "/api/business/**").hasRole("BUSINESS_OWNER")

                        // DOCUMENTS — owners upload, admin + owner view
                        .requestMatchers(HttpMethod.GET, "/api/documents/*/file").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/documents/**").hasAnyRole("BUSINESS_OWNER", "SUPER_ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/documents/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.DELETE, "/api/documents/**").hasRole("BUSINESS_OWNER")

                        // SLOTS
                        .requestMatchers(HttpMethod.GET, "/api/slots/**").permitAll()

                        // PAYMENTS
                        .requestMatchers(HttpMethod.POST, "/api/payments/create-order").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/payments/verify").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/payments/initiate-completion/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.POST, "/api/payments/confirm-otp").hasRole("BUSINESS_OWNER")
                        // Consent endpoints are PUBLIC — no auth needed (token is the auth)
                        .requestMatchers(HttpMethod.GET,  "/api/payments/consent/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/payments/consent/**").permitAll()

                        // PAYMENT ACCOUNTS
                        .requestMatchers(HttpMethod.GET,    "/api/payment-accounts/business/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.POST,   "/api/payment-accounts").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.PATCH,  "/api/payment-accounts/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.DELETE, "/api/payment-accounts/**").hasRole("BUSINESS_OWNER")

                        // APPOINTMENTS
                        .requestMatchers(HttpMethod.POST, "/api/appointments").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/appointments/my").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/appointments/*/cancel").hasRole("CUSTOMER")
                        .requestMatchers(HttpMethod.PUT, "/api/appointments/*/reschedule").hasRole("CUSTOMER")
                        .requestMatchers("/api/appointments/my-business").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.PUT, "/api/appointments/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.PATCH, "/api/appointments/**").hasRole("BUSINESS_OWNER")

                        // REVIEWS
                        .requestMatchers(HttpMethod.GET, "/api/reviews/avg/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews/avg/service/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/reviews").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/reviews/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/reviews/**").permitAll()

                        // ADMIN
                        .requestMatchers("/api/admin/**").hasRole("SUPER_ADMIN")

                        // USER PROFILE
                        .requestMatchers(HttpMethod.GET, "/api/users/me").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/users/profile").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/users/change-password").authenticated()

                        // HOLIDAYS
                        .requestMatchers(HttpMethod.GET, "/api/holidays/public/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/holidays/business/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.GET, "/api/holidays/service/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.GET, "/api/holidays/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/holidays").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.DELETE, "/api/holidays/**").hasRole("BUSINESS_OWNER")

                        // PHOTOS
                        .requestMatchers(HttpMethod.GET, "/api/photos/service/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/photos/service/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.DELETE, "/api/photos/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers("/uploads/**").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/services/by-category/**").permitAll()

                        .anyRequest().authenticated())
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .oauth2Login(oauth -> oauth.successHandler(oAuth2SuccessHandler))
                .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)

                .headers(headers -> headers
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .preload(true)
                                .maxAgeInSeconds(31536000)
                        )
                        .frameOptions(frame -> frame.deny())
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(frontendUrl);
        config.setAllowedMethods(allowedMethods);
        // Explicitly list allowed headers instead of wildcard
        config.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "X-Requested-With",
                "Cache-Control"
        ));
        config.setAllowCredentials(true);
        // Important: Allow the refresh token cookie to be sent
        config.setExposedHeaders(List.of("Set-Cookie"));
        // Cache preflight responses for 1 hour
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}