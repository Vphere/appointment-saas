package org.vaidik.appointment.dto;

import lombok.Data;
import org.vaidik.appointment.entity.AppointmentStatus;

@Data
public class UpdateAppointmentStatusRequest {
    private AppointmentStatus status;
}
