package org.vaidik.appointment.config;

import lombok.RequiredArgsConstructor;
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
import org.springframework.web.cors.*;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@RequiredArgsConstructor
@EnableMethodSecurity
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))      // Allows frontend to access backend.
                .csrf(csrf -> csrf.disable())       // CSRF protection is mainly for session-based authentication, Since we are using JWT stateless authentication, we disable it.
                .authorizeHttpRequests(auth -> auth
                        // AUTH
                        .requestMatchers("/api/auth/**", "/oauth2/**", "/login/**").permitAll()

                        // SERVICES
                        .requestMatchers(HttpMethod.GET, "/api/services").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/services/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.PUT, "/api/services/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.DELETE, "/api/services/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.GET, "/api/services/**").permitAll()

                        // BUSINESS
                        .requestMatchers(HttpMethod.GET, "/api/business").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/business/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.GET, "/api/business/**").permitAll()

                        // SLOTS
                        .requestMatchers(HttpMethod.GET, "/api/slots/**").permitAll()

                        // APPOINTMENTS
                        .requestMatchers(HttpMethod.POST, "/api/appointments").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/appointments/my").authenticated()

                        .requestMatchers(HttpMethod.PATCH, "/api/appointments/*/cancel").hasRole("CUSTOMER")
                        .requestMatchers(HttpMethod.PUT, "/api/appointments/*/reschedule").hasRole("CUSTOMER")

                        .requestMatchers("/api/appointments/my-business").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.PUT, "/api/appointments/**").hasRole("BUSINESS_OWNER")
                        .requestMatchers(HttpMethod.PATCH, "/api/appointments/**").hasRole("BUSINESS_OWNER")
                        .anyRequest().authenticated())
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE","PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}