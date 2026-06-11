package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConsentResponse {
    private Long   appointmentId;
    private String businessName;
    private String serviceName;
    private String customerName;
    private String appointmentDate;
    private String appointmentTime;
}