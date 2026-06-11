package org.vaidik.appointment.dto;

import lombok.Data;

@Data
public class OtpVerifyRequest {
    private Long   appointmentId;
    private String otp;
}