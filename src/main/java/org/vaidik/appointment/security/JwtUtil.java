package org.vaidik.appointment.security;

import io.jsonwebtoken.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    // Allow up to 60 seconds of clock skew between client and server.
    // This prevents spurious ExpiredJwtException when a token expires in the window between the client sending the
    // request and the server validating it.
    private static final long CLOCK_SKEW_SECONDS = 60L;

    public String generateToken(String email, String role, String name) {
        return Jwts.builder()
                .setSubject(email)
                .claim("role", "ROLE_" + role)
                .claim("name", name)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(SignatureAlgorithm.HS256, secret)
                .compact();
    }

    public String extractEmail(String token) {
        return Jwts.parser()
                .setSigningKey(secret)
                .setAllowedClockSkewSeconds(CLOCK_SKEW_SECONDS)
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            Jwts.parser()
                    .setSigningKey(secret)
                    .setAllowedClockSkewSeconds(CLOCK_SKEW_SECONDS)
                    .parseClaimsJws(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }

    public String extractRole(String token) {
        return Jwts.parser()
                .setSigningKey(secret)
                .setAllowedClockSkewSeconds(CLOCK_SKEW_SECONDS)
                .parseClaimsJws(token)
                .getBody()
                .get("role", String.class);
    }
}