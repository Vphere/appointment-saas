package org.vaidik.appointment.dto;

import lombok.Data;

@Data
public class CompleteProfileRequest {
    private String email;
    private String role;
}