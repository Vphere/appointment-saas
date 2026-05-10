package org.vaidik.appointment.dto;

import lombok.*;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessAnalyticsResponse {

    // KPI cards
    private double totalRevenue;
    private long totalCompleted;
    private long totalCancelled;
    private long totalPending;
    private long totalConfirmed;
    private long totalAppointments;

    // Bar chart — revenue per month (e.g. "2026-03" -> 1200.0)
    private Map<String, Double> revenueByMonth;

    // Pie chart — revenue per service name
    private Map<String, Double> revenueByService;

    // Revenue per business (if owner has multiple businesses)
    private Map<String, Double> revenueByBusiness;

    // Appointments per month (for appointment volume bar chart)
    private Map<String, Long> appointmentsByMonth;

    // Recent completed appointments table
    private List<RecentAppointmentDTO> recentCompletedAppointments;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RecentAppointmentDTO {
        private String customerName;
        private String serviceName;
        private String businessName;
        private String date;
        private double revenue;
        private String status;
    }
}