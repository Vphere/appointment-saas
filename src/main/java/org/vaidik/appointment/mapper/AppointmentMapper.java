package org.vaidik.appointment.mapper;

import org.springframework.stereotype.Component;
import org.vaidik.appointment.dto.AppointmentResponse;
import org.vaidik.appointment.entity.Appointment;
import org.vaidik.appointment.entity.ServiceOffering;

@Component
public class AppointmentMapper {

    public AppointmentResponse toResponse(Appointment appointment) {

        ServiceOffering s = appointment.getService();

        return AppointmentResponse.builder()
                .id(appointment.getId())
                .userId(appointment.getUser().getId())
                .userName(appointment.getUser().getName())
                .userEmail(appointment.getUser().getEmail())
                .businessId(appointment.getBusiness().getId())
                .businessName(appointment.getBusiness().getName())
                .serviceId(s != null ? s.getId() : null)
                .serviceName(s != null ? s.getName() : null)
                .price(s != null ? appointment.getService().getPrice() : null)
                .appointmentDate(appointment.getAppointmentDate())
                .appointmentTime(appointment.getAppointmentTime())
                .status(appointment.getStatus())
                .reviewed(appointment.getReviewed())
                .createdAt(appointment.getCreatedAt())
                .updatedAt(appointment.getUpdatedAt())
                .duration(s != null ? s.getDuration() : null)
                .serviceAddress(s != null ? s.getAddress() : null)
                .serviceCity(s != null ? s.getCity() : null)
                .serviceState(s != null ? s.getState() : null)
                .serviceCountry(s != null ? s.getCountry() : null)
                .servicePincode(s != null ? s.getPincode() : null)
                .build();
    }
}