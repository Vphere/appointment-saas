package org.vaidik.appointment.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

///**
// * Optional RabbitMQ-backed retry layer for outbound email.
// *
// * This is OFF by default (gated by {@code app.email.queue.enabled=true}) so the
// * application starts and runs normally even when no RabbitMQ broker has been
// * provisioned. The {@link EmailDeliveryService} + DB-backed
// * {@code email_outbox} table (see {@link org.vaidik.appointment.service.EmailRetryScheduler})
// * already guarantee eventual delivery via polling; RabbitMQ simply makes
// * retries near-instant instead of waiting for the next scheduler tick.
// *
// * Topology:
// *   email.exchange (direct)
// *     ├─ "email.send"      -> email.queue            (main work queue)
// *     ├─ "email.retry.1m"  -> email.retry.1m (TTL=1m)  --(DLX)--> email.send
// *     ├─ "email.retry.5m"  -> email.retry.5m (TTL=5m)  --(DLX)--> email.send
// *     ├─ "email.retry.15m" -> email.retry.15m(TTL=15m) --(DLX)--> email.send
// *     └─ "email.dead"      -> email.dlq               (exhausted retries)
// *
// * To enable: provision a RabbitMQ instance (e.g. CloudAMQP free tier), set
// * RABBITMQ_HOST / RABBITMQ_PORT / RABBITMQ_USERNAME / RABBITMQ_PASSWORD /
// * RABBITMQ_VHOST env vars and set EMAIL_QUEUE_ENABLED=true.
// */
@Configuration
@ConditionalOnProperty(name = "app.email.queue.enabled", havingValue = "true")
public class RabbitMQConfig {

    public static final String EMAIL_EXCHANGE = "email.exchange";

    public static final String EMAIL_QUEUE = "email.queue";
    public static final String EMAIL_ROUTING_KEY = "email.send";

    public static final String RETRY_1M_QUEUE = "email.retry.1m";
    public static final String RETRY_5M_QUEUE = "email.retry.5m";
    public static final String RETRY_15M_QUEUE = "email.retry.15m";

    public static final String DLQ = "email.dlq";
    public static final String DLQ_ROUTING_KEY = "email.dead";

    @Bean
    public DirectExchange emailExchange() {
        return new DirectExchange(EMAIL_EXCHANGE, true, false);
    }

    // ── Main work queue ────────────────────────────────────────────────
    @Bean
    public Queue emailQueue() {
        return QueueBuilder.durable(EMAIL_QUEUE).build();
    }

    @Bean
    public Binding emailBinding(Queue emailQueue, DirectExchange emailExchange) {
        return BindingBuilder.bind(emailQueue).to(emailExchange).with(EMAIL_ROUTING_KEY);
    }

    // ── Retry queues: TTL expiry dead-letters back to the main queue ────
    @Bean
    public Queue retry1mQueue() {
        return QueueBuilder.durable(RETRY_1M_QUEUE)
                .withArgument("x-message-ttl", 60_000)
                .withArgument("x-dead-letter-exchange", EMAIL_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", EMAIL_ROUTING_KEY)
                .build();
    }

    @Bean
    public Binding retry1mBinding(Queue retry1mQueue, DirectExchange emailExchange) {
        return BindingBuilder.bind(retry1mQueue).to(emailExchange).with(RETRY_1M_QUEUE);
    }

    @Bean
    public Queue retry5mQueue() {
        return QueueBuilder.durable(RETRY_5M_QUEUE)
                .withArgument("x-message-ttl", 5 * 60_000)
                .withArgument("x-dead-letter-exchange", EMAIL_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", EMAIL_ROUTING_KEY)
                .build();
    }

    @Bean
    public Binding retry5mBinding(Queue retry5mQueue, DirectExchange emailExchange) {
        return BindingBuilder.bind(retry5mQueue).to(emailExchange).with(RETRY_5M_QUEUE);
    }

    @Bean
    public Queue retry15mQueue() {
        return QueueBuilder.durable(RETRY_15M_QUEUE)
                .withArgument("x-message-ttl", 15 * 60_000)
                .withArgument("x-dead-letter-exchange", EMAIL_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", EMAIL_ROUTING_KEY)
                .build();
    }

    @Bean
    public Binding retry15mBinding(Queue retry15mQueue, DirectExchange emailExchange) {
        return BindingBuilder.bind(retry15mQueue).to(emailExchange).with(RETRY_15M_QUEUE);
    }

    // ── Dead-letter queue for permanently failed emails ─────────────────
    @Bean
    public Queue emailDeadLetterQueue() {
        return QueueBuilder.durable(DLQ).build();
    }

    @Bean
    public Binding dlqBinding(Queue emailDeadLetterQueue, DirectExchange emailExchange) {
        return BindingBuilder.bind(emailDeadLetterQueue).to(emailExchange).with(DLQ_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public AmqpTemplate rabbitTemplate(org.springframework.amqp.rabbit.connection.ConnectionFactory connectionFactory,
                                       MessageConverter converter) {
        org.springframework.amqp.rabbit.core.RabbitTemplate template =
                new org.springframework.amqp.rabbit.core.RabbitTemplate(connectionFactory);
        template.setMessageConverter(converter);
        return template;
    }
}