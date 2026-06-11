package org.vaidik.appointment.dto;

import lombok.Data;

@Data
public class BusinessPaymentAccountRequest {
    private Long   businessId;
    private String accountHolderName;
    private String accountNumber;
    private String ifscCode;
    private String bankName;
    private String nickname;
    private Boolean isDefault;
}