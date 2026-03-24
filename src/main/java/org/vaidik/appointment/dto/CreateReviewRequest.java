package org.vaidik.appointment.dto;

import lombok.Data;

@Data
public class CreateReviewRequest {

    private Long businessId;
    private Long userId;
    private int rating;
    private String comment;
    private Long appointmentId;
}