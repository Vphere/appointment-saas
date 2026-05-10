package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.vaidik.appointment.entity.Otp;

import java.util.Optional;

public interface OtpRepository extends JpaRepository<Otp, Long> {
    Optional<Otp> findByEmail(String email);
    void deleteByEmail(String email);
}
