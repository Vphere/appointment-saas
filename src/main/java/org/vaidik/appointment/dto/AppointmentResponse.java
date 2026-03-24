package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Data;
import org.vaidik.appointment.entity.AppointmentStatus;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
public class AppointmentResponse {

    private Long id;
    private Long userId;
    private Long businessId;
    private Long serviceId;
    private LocalDate appointmentDate;
    private LocalTime appointmentTime;
    private AppointmentStatus status;
    private String businessName;
    private String serviceName;
}
