package org.vaidik.appointment.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "service_completion_consents")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ServiceCompletionConsent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false, unique = true)
    private Appointment appointment;

    @Column(name = "otp_hash", nullable = false)
    private String otpHash;

    @Column(name = "consent_token", nullable = false, unique = true)
    private String consentToken;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Builder.Default
    @Column(name = "is_used")
    private Boolean isUsed = false;

    @Builder.Default
    @Column(name = "resend_count")
    private Integer resendCount = 0;

    @Column(name = "resolved_by")
    private String resolvedBy; // "OTP" or "LINK"

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}