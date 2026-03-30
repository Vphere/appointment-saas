package org.vaidik.appointment.mapper;

import org.springframework.stereotype.Component;
import org.vaidik.appointment.dto.AppointmentResponse;
import org.vaidik.appointment.entity.Appointment;

@Component
public class AppointmentMapper {

    public AppointmentResponse toResponse(Appointment appointment) {

        return AppointmentResponse.builder()
                .id(appointment.getId())
                .userId(appointment.getUser().getId())
                .userName(appointment.getUser().getName())
                .userEmail(appointment.getUser().getEmail())
                .businessId(appointment.getBusiness().getId())
                .businessName(appointment.getBusiness().getName())
                .serviceId(appointment.getService().getId())
                .serviceName(appointment.getService().getName())
                .price(appointment.getService().getPrice() != null ? appointment.getService().getPrice().doubleValue() : null)
                .appointmentDate(appointment.getAppointmentDate())
                .appointmentTime(appointment.getAppointmentTime())
                .status(appointment.getStatus())
                .reviewed(appointment.getReviewed())
                .createdAt(appointment.getCreatedAt())
                .duration(appointment.getService().getDuration())
                .build();
    }
}