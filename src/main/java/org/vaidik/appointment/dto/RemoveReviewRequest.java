package org.vaidik.appointment.dto;

import lombok.Data;

@Data
public class RemoveReviewRequest {
    private String reason;
    private String details;
}