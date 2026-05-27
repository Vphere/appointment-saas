package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.entity.RefreshToken;
import org.vaidik.appointment.entity.User;
import org.vaidik.appointment.repository.RefreshTokenRepository;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    @Value("${jwt.refresh-expiration}") // e.g. 604800000 = 7 days in ms
    private long refreshExpiration;

    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional
    public RefreshToken createRefreshToken(User user) {
        // Delete any existing refresh token for this user (one token per user)
        refreshTokenRepository.deleteByUser(user);
        refreshTokenRepository.flush(); // ← ADD THIS, same as rotateRefreshToken

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiryDate(Instant.now().plusMillis(refreshExpiration))
                .build();

        return refreshTokenRepository.save(refreshToken);
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("Refresh token expired. Please login again.");
        }
        return token;
    }

    public RefreshToken findByToken(String token) {
        return refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid refresh token"));
    }

    @Transactional
    public void deleteByUser(User user) {
        refreshTokenRepository.deleteByUser(user);
    }

    /**
     * Rotate: validate the old token, delete it, issue a brand-new one.
     * Call this from AuthService on every /refresh request.
     */
    @Transactional
    public RefreshToken rotateRefreshToken(String oldTokenValue) {
        RefreshToken oldToken = findByToken(oldTokenValue);   // throws if not found
        verifyExpiration(oldToken);                            // throws if expired

        User user = oldToken.getUser();

        refreshTokenRepository.delete(oldToken);              // invalidate old token immediately
        refreshTokenRepository.flush();                       // ensure delete hits DB before insert

        // Issue a fresh token for the same user
        RefreshToken newToken = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiryDate(Instant.now().plusMillis(refreshExpiration))
                .build();

        return refreshTokenRepository.save(newToken);
    }
}