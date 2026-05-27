package org.vaidik.appointment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "businesses")
public class Business {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "business_type")
    private BusinessType businessType;

    @Column(name = "pan_number", length = 10)
    private String panNumber;

    // ── Annual Turnover (determines GST requirement) ──────────────
    @Column(name = "annual_turnover")
    private Long annualTurnover;

    // ── GST (conditional — required if turnover > threshold) ──────
    @Column(name = "gst_number", length = 15)
    private String gstNumber;

    // ── Optional: Udyam / MSME registration ──────────────────────
    @Column(name = "udyam_number")
    private String udyamNumber;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    private BusinessStatus status;

    @ManyToOne
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    // ── GST threshold (20 Lakhs for service businesses in India) ──
    public static final long GST_THRESHOLD = 2_000_000L; // 20,00,000

    public boolean isGstRequired() {
        return annualTurnover != null && annualTurnover > GST_THRESHOLD;
    }
}