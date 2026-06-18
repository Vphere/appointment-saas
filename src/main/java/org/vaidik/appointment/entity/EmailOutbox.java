package org.vaidik.appointment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_outbox", indexes = {
        @Index(name = "idx_outbox_status_next_attempt", columnList = "status,next_attempt_at")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EmailOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String recipient;

    @Column(nullable = false, length = 500)
    private String subject;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String htmlBody;

    /** Logical category, e.g. OTP, STATUS_CHANGE, REMINDER — for logging/metrics only. */
    @Column(nullable = false)
    private String emailType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EmailStatus status;

    @Builder.Default
    @Column(name = "retry_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    private int retryCount = 0;

    @Builder.Default
    @Column(name = "max_retries", nullable = false, columnDefinition = "INT DEFAULT 6")
    private int maxRetries = 6;

    @Column(name = "next_attempt_at")
    private LocalDateTime nextAttemptAt;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_attempt_at")
    private LocalDateTime lastAttemptAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(columnDefinition = "TEXT")
    private String lastError;
}
