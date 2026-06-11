package org.vaidik.appointment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "business_payment_accounts")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BusinessPaymentAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @Column(name = "account_holder_name", nullable = false)
    private String accountHolderName;

    // Store last 4 digits only for display; full number encrypted in real prod
    @Column(name = "account_number", nullable = false)
    private String accountNumber;

    @Column(name = "ifsc_code", nullable = false)
    private String ifscCode;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "nickname")
    private String nickname; // "Main Account", "Salon Account", etc.

    @Builder.Default
    @Column(name = "is_default")
    private Boolean isDefault = false;

    // In test mode this is always true (skip penny drop)
    // In live mode, set after Razorpay penny drop verification
    @Builder.Default
    @Column(name = "is_verified")
    private Boolean isVerified = true;

    // Razorpay contact/fund IDs (populated when payout feature is enabled)
    @Column(name = "razorpay_contact_id")
    private String razorpayContactId;

    @Column(name = "razorpay_fund_account_id")
    private String razorpayFundAccountId;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}