package org.vaidik.appointment.mapper;

import org.springframework.stereotype.Component;
import org.vaidik.appointment.dto.ReviewResponse;
import org.vaidik.appointment.entity.Review;

@Component
public class ReviewMapper {

    public ReviewResponse toResponse(Review review) {
        // Safely get service name from appointment → serviceOffering
        String serviceName = null;
        Long appointmentId = null;
        if (review.getAppointment() != null) {
            appointmentId = review.getAppointment().getId();
            if (review.getAppointment().getService() != null) {
                serviceName = review.getAppointment().getService().getName();
            }
        }

        return ReviewResponse.builder()
                .id(review.getId())
                .rating(review.getRating())
                .comment(review.getComment())
                // User
                .userId(review.getUser().getId())
                .customerName(review.getUser().getName())
                .customerEmail(review.getUser().getEmail())
                // Business
                .businessId(review.getBusiness().getId())
                .businessName(review.getBusiness().getName())
                // Service
                .serviceName(serviceName)
                // Appointment
                .appointmentId(appointmentId)
                .appointmentDate(
                        review.getAppointment() != null
                                ? review.getAppointment().getAppointmentDate()
                                : null
                )
                // Soft-delete
                .removedByAdmin(review.isRemovedByAdmin())
                .removalReason(review.getRemovalReason())
                .removedAt(review.getRemovedAt())
                .build();
    }
}