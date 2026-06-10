package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DeleteBusinessPreflightResponse {
    private String message;
    private int activeAppointmentCount;  // PENDING + CONFIRMED
    private int serviceCount;
}