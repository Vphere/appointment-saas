package org.vaidik.appointment.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.vaidik.appointment.entity.EmailOutbox;
import org.vaidik.appointment.entity.EmailStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EmailOutboxRepository extends JpaRepository<EmailOutbox, Long> {
    List<EmailOutbox> findTop20ByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
            List<EmailStatus> statuses, LocalDateTime now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM EmailOutbox e WHERE e.id = :id")
    Optional<EmailOutbox> findByIdForUpdate(@Param("id") Long id);
}