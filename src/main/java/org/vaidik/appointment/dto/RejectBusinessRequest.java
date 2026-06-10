package org.vaidik.appointment.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RejectBusinessRequest {
    private String rejectionReason;   // e.g. "PAN card scan is blurry"
    private String requiredActions;   // e.g. "Upload a clearer PAN scan. Provide GST certificate."
}