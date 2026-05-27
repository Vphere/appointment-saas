package org.vaidik.appointment.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BusinessRequest {
    private String name;
    private String description;
    private String phone;
    private String businessType;

    // Verification
    private String panNumber;
    private Long annualTurnover;
    private String gstNumber;
    private String udyamNumber;
}