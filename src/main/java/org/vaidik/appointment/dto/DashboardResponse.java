package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardResponse {

    private long totalBookings;

    private long pendingBookings;

    private long completedBookings;

    private long totalServices;

}