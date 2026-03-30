package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Data;
import org.vaidik.appointment.entity.AppointmentStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
public class AppointmentResponse {

    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private Long businessId;
    private String businessName;
    private Long serviceId;
    private String serviceName;
    private LocalDate appointmentDate;
    private LocalTime appointmentTime;
    private AppointmentStatus status;
    private Double price;
    private Boolean reviewed;
    private LocalDateTime createdAt;
    private Integer duration;
}
