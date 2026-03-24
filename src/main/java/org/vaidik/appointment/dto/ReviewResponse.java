package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReviewResponse {
    private Long id;

    private int rating;

    private String comment;

    private Long userId;
}
