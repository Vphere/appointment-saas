package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.vaidik.appointment.entity.RefreshToken;
import org.vaidik.appointment.entity.User;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    void deleteByUser(User user);
}