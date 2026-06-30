package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.vaidik.appointment.entity.EmailOutbox;
import org.vaidik.appointment.entity.EmailStatus;
import org.vaidik.appointment.repository.EmailOutboxRepository;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmailRetryScheduler {

    private final EmailOutboxRepository outboxRepository;
    private final EmailDeliveryService emailDeliveryService;

    @Scheduled(fixedRate = 60 * 1000)
    public void retryDueEmails() {
        List<EmailOutbox> due = outboxRepository
                .findTop20ByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
                        List.of(EmailStatus.FAILED), LocalDateTime.now());

        if (due.isEmpty()) return;

        log.info("Email retry scheduler: {} email(s) due for (re)delivery", due.size());
        for (EmailOutbox job : due) {
            emailDeliveryService.attemptSend(job);
        }
    }
}