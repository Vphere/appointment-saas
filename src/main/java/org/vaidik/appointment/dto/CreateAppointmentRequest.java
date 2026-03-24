package org.vaidik.appointment.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class CreateAppointmentRequest {

    private Long businessId;
    private Long serviceId;
    private LocalDate appointmentDate;
    private LocalTime appointmentTime;

}