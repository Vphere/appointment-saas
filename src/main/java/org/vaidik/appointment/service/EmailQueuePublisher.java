package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.AmqpTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.vaidik.appointment.config.RabbitMQConfig;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.email.queue.enabled", havingValue = "true")
public class EmailQueuePublisher {

    private final AmqpTemplate rabbitTemplate;

    /** Send for (re)processing as soon as possible. */
    public void publish(Long outboxId) {
        publish(RabbitMQConfig.EMAIL_ROUTING_KEY, outboxId);
    }

    /**
     * Schedule a retry using one of the TTL-backed retry queues, based on
     * how many attempts have already been made (0-indexed).
     */
    public void publishRetry(Long outboxId, int attemptsMade) {
        String routingKey = switch (attemptsMade) {
            case 0 -> RabbitMQConfig.RETRY_1M_QUEUE;
            case 1 -> RabbitMQConfig.RETRY_5M_QUEUE;
            default -> RabbitMQConfig.RETRY_15M_QUEUE;
        };
        publish(routingKey, outboxId);
    }

    public void publishDead(Long outboxId) {
        publish(RabbitMQConfig.DLQ_ROUTING_KEY, outboxId);
    }

    private void publish(String routingKey, Long outboxId) {
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EMAIL_EXCHANGE, routingKey, Map.of("outboxId", outboxId));
        } catch (Exception e) {
            log.warn("Could not publish email job #{} to RabbitMQ (routing key '{}'): {}. " +
                    "It will still be retried by the DB-backed scheduler.", outboxId, routingKey, e.getMessage());
        }
    }
}