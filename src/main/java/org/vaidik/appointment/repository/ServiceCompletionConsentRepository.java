package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.entity.ServiceCompletionConsent;

import java.util.Optional;

public interface ServiceCompletionConsentRepository extends JpaRepository<ServiceCompletionConsent, Long> {

    @Query("""
        SELECT c FROM ServiceCompletionConsent c
        JOIN FETCH c.appointment a
        JOIN FETCH a.user
        JOIN FETCH a.business b
        JOIN FETCH a.service
        WHERE c.consentToken = :token
    """)
    Optional<ServiceCompletionConsent> findByConsentToken(@Param("token") String token);

    Optional<ServiceCompletionConsent> findByAppointmentId(Long appointmentId);

    @Modifying
    @Transactional
    @Query("DELETE FROM ServiceCompletionConsent c WHERE c.appointment.user.id = :userId")
    void deleteByAppointmentUserId(@Param("userId") Long userId);
}