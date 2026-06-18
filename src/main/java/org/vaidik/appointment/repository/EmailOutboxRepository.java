package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.vaidik.appointment.entity.EmailOutbox;
import org.vaidik.appointment.entity.EmailStatus;

import java.time.LocalDateTime;
import java.util.List;

public interface EmailOutboxRepository extends JpaRepository<EmailOutbox, Long> {
    List<EmailOutbox> findTop20ByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
            List<EmailStatus> statuses, LocalDateTime now);
}