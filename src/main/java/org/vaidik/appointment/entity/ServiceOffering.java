package org.vaidik.appointment.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "service_offerings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceOffering {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private Double price;

    // Nullable for CONSULTATION type
    private Integer duration;

    // Buffer between appointments (minutes)
    @Column(name = "gap_minutes")
    @Builder.Default
    private Integer gapMinutes = 0;

    // FIXED = set duration, CONSULTATION = flexible slots
    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", nullable = false)
    @Builder.Default
    private ServiceType serviceType = ServiceType.FIXED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    private String address;
    private String city;
    private String state;
    private String country;

    @Column(length = 10)
    private String pincode;

    // NULL  → active service
    // non-NULL → soft-deleted; value is the deletion timestamp
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    @Builder.Default
    private ServiceCategory category = ServiceCategory.OTHER;
}