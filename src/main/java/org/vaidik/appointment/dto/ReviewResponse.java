package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class ReviewResponse {
    private Long id;
    private int rating;
    private String comment;

    // User info
    private Long userId;
    private String customerName;
    private String customerEmail;

    // Business & service info
    private Long businessId;
    private String businessName;
    private String serviceName;

    // Appointment info
    private Long appointmentId;
    private LocalDate appointmentDate;

    private boolean removedByAdmin;
    private String removalReason;
    private LocalDateTime removedAt;
}