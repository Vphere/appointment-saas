package org.vaidik.appointment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "business_photos")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BusinessPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceOffering service;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private String url;

    private String caption;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime uploadedAt;
}