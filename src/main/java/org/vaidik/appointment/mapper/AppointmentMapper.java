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
                .businessId(appointment.getBusiness().getId())
                .serviceId(appointment.getService().getId())
                .appointmentDate(appointment.getAppointmentDate())
                .appointmentTime(appointment.getAppointmentTime())
                .status(appointment.getStatus())
                .businessName(appointment.getBusiness().getName())
                .serviceName(appointment.getService().getName())
                .build();
    }
}