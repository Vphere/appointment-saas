package org.vaidik.appointment.mapper;

import org.springframework.stereotype.Component;
import org.vaidik.appointment.dto.ReviewResponse;
import org.vaidik.appointment.entity.Review;

@Component
public class ReviewMapper {

    public ReviewResponse toResponse(Review review) {

        return ReviewResponse.builder()
                .id(review.getId())
                .rating(review.getRating())
                .comment(review.getComment())
                .userId(review.getUser().getId())
                .build();
    }
}