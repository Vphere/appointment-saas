package org.vaidik.appointment.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeleteBusinessRequest {
    private String otp;           // OTP sent to owner's email
    private String businessName;  // must match exactly — typed confirmation
}