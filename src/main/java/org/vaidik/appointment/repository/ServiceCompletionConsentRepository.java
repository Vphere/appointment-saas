package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.vaidik.appointment.entity.ServiceCompletionConsent;

import java.util.Optional;

public interface ServiceCompletionConsentRepository extends JpaRepository<ServiceCompletionConsent, Long> {
    Optional<ServiceCompletionConsent> findByConsentToken(String token);
    Optional<ServiceCompletionConsent> findByAppointmentId(Long appointmentId);
}