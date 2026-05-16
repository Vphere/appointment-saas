package org.vaidik.appointment.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStatsResponse {
    // Business stats
    private long totalBusinesses;
    private long pendingBusinesses;
    private long approvedBusinesses;
    private long rejectedBusinesses;

    // User stats
    private long totalUsers;
    private long totalCustomers;
    private long totalBusinessOwners;

    // Appointment stats
    private long totalAppointments;
    private long completedAppointments;
    private long cancelledAppointments;

    // Review stats
    private long totalReviews;
    private double averageRating;
}