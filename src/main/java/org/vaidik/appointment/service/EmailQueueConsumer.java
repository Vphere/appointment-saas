package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.vaidik.appointment.config.RabbitMQConfig;
import org.vaidik.appointment.entity.EmailOutbox;
import org.vaidik.appointment.entity.EmailStatus;
import org.vaidik.appointment.repository.EmailOutboxRepository;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.email.queue.enabled", havingValue = "true")
public class EmailQueueConsumer {

    private final EmailOutboxRepository outboxRepository;
    private final EmailDeliveryService emailDeliveryService;
    private final EmailQueuePublisher emailQueuePublisher;

    @RabbitListener(queues = RabbitMQConfig.EMAIL_QUEUE, messageConverter = "jsonMessageConverter")
    public void handle(Map<String, Object> message) {
        Long outboxId = extractOutboxId(message);
        if (outboxId == null) return;

        outboxRepository.findById(outboxId).ifPresentOrElse(job -> {
            if (job.getStatus() == EmailStatus.SENT) {
                return; // already delivered, e.g. duplicate/late message
            }

            boolean sent = emailDeliveryService.attemptSend(job);
            if (sent) return;

            EmailOutbox refreshed = outboxRepository.findById(outboxId).orElse(job);
            if (refreshed.getStatus() == EmailStatus.DEAD) {
                emailQueuePublisher.publishDead(outboxId);
            } else {
                emailQueuePublisher.publishRetry(outboxId, refreshed.getRetryCount() - 1);
            }
        }, () -> log.warn("Email outbox job #{} referenced by queue message no longer exists", outboxId));
    }

    private Long extractOutboxId(Map<String, Object> message) {
        Object raw = message.get("outboxId");
        if (raw instanceof Number n) return n.longValue();
        try {
            return raw != null ? Long.parseLong(raw.toString()) : null;
        } catch (NumberFormatException e) {
            log.warn("Could not parse outboxId from email queue message: {}", message);
            return null;
        }
    }
}