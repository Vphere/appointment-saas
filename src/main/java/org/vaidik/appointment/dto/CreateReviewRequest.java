package org.vaidik.appointment.dto;

import lombok.Data;

@Data
public class CreateReviewRequest {
    private Long appointmentId;
    private int rating;
    private String comment;
}