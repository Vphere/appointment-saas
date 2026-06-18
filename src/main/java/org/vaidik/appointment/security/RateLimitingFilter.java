package org.vaidik.appointment.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

/**
 * Lightweight, in-memory IP-based rate limiting for sensitive auth endpoints.
 *
 * Protects against brute-force login attempts, OTP spamming and registration
 * abuse. Limits are intentionally generous for normal users but cap
 * automated abuse:
 *
 * Note: this is per-instance (in-memory). If the backend is scaled to
 * multiple instances, move the bucket storage to a shared store such as
 * Redis (bucket4j has a Redis-backed proxy manager) for consistent limits.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    private static final Map<String, Function<String, Bucket>> LIMITED_ROUTES = Map.of(
            "/api/auth/login",           key -> newBucket(10, Duration.ofMinutes(1)),
            "/api/auth/register",        key -> newBucket(5,  Duration.ofMinutes(1)),
            "/api/auth/forgot-password", key -> newBucket(3,  Duration.ofMinutes(10)),
            "/api/auth/verify-otp",      key -> newBucket(10, Duration.ofMinutes(10)),
            "/api/auth/reset-password",  key -> newBucket(5,  Duration.ofMinutes(10))
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        Function<String, Bucket> bucketFactory = LIMITED_ROUTES.get(path);

        if (bucketFactory == null || !"POST".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = path + "|" + clientIp(request);
        Bucket bucket = buckets.computeIfAbsent(key, bucketFactory);

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(429); // Too Many Requests
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"message\":\"Too many requests. Please wait a moment and try again.\"}");
        }
    }

    private static Bucket newBucket(int capacity, Duration period) {
        Bandwidth limit = Bandwidth.classic(capacity, Refill.greedy(capacity, period));
        return Bucket.builder().addLimit(limit).build();
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}