package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class ReviewResponse {
    private Long id;
    private int rating;
    private String comment;
    private Long userId;
    private String customerName;
    private LocalDate appointmentDate;
}
