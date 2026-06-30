package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.entity.EmailOutbox;
import org.vaidik.appointment.entity.EmailStatus;
import org.vaidik.appointment.repository.EmailOutboxRepository;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailDeliveryService {

    private final EmailTransport emailTransport;
    private final EmailOutboxRepository outboxRepository;

    /** Backoff schedule (minutes) applied after the 1st, 2nd, 3rd ... failed attempt. */
    private static final int[] BACKOFF_MINUTES = {1, 5, 15, 30, 60, 180};

    public EmailOutbox enqueue(String to, String subject, String html, String emailType) {
        EmailOutbox job = EmailOutbox.builder()
                .recipient(to)
                .subject(subject)
                .htmlBody(html)
                .emailType(emailType)
                .status(EmailStatus.PENDING)
                .retryCount(0)
                .maxRetries(BACKOFF_MINUTES.length)
                .nextAttemptAt(LocalDateTime.now())
                .build();
        return outboxRepository.save(job);
    }

    @Transactional
    public boolean attemptSend(EmailOutbox job) {
        EmailOutbox locked = outboxRepository.findByIdForUpdate(job.getId())
                .orElse(job); // fallback to the passed-in instance if somehow already deleted

        if (locked.getStatus() == EmailStatus.SENT) {
            return true; // already delivered by a concurrent caller while we waited for the lock
        }
        try {
            emailTransport.send(locked.getRecipient(), locked.getSubject(), locked.getHtmlBody());
            markSent(locked);
            return true;
        } catch (Exception e) {
            markFailed(locked, e);
            return false;
        }
    }

    private void markSent(EmailOutbox job) {
        job.setStatus(EmailStatus.SENT);
        job.setSentAt(LocalDateTime.now());
        job.setLastAttemptAt(LocalDateTime.now());
        job.setLastError(null);
        outboxRepository.save(job);
        log.info("Email #{} ({}) to {} sent successfully", job.getId(), job.getEmailType(), job.getRecipient());
    }

    private void markFailed(EmailOutbox job, Exception e) {
        int attemptsMade = job.getRetryCount() + 1;
        job.setRetryCount(attemptsMade);
        job.setLastAttemptAt(LocalDateTime.now());
        job.setLastError(truncate(e.getMessage(), 500));

        if (attemptsMade >= job.getMaxRetries()) {
            job.setStatus(EmailStatus.DEAD);
            log.error("Email #{} ({}) to {} permanently FAILED after {} attempts: {}",
                    job.getId(), job.getEmailType(), job.getRecipient(), attemptsMade, e.getMessage());
        } else {
            int backoffMinutes = BACKOFF_MINUTES[Math.min(attemptsMade - 1, BACKOFF_MINUTES.length - 1)];
            job.setStatus(EmailStatus.FAILED);
            job.setNextAttemptAt(LocalDateTime.now().plusMinutes(backoffMinutes));
            log.warn("Email #{} ({}) to {} failed (attempt {}/{}), retrying in {} min: {}",
                    job.getId(), job.getEmailType(), job.getRecipient(), attemptsMade, job.getMaxRetries(),
                    backoffMinutes, e.getMessage());
        }
        outboxRepository.save(job);
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}