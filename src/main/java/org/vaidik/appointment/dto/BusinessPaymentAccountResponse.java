package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BusinessPaymentAccountResponse {
    private Long    id;
    private Long    businessId;
    private String  accountHolderName;
    private String  maskedAccountNumber; // e.g. ••••4321
    private String  ifscCode;
    private String  bankName;
    private String  nickname;
    private Boolean isDefault;
    private Boolean isVerified;
}