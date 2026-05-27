package org.vaidik.appointment.mapper;

import org.springframework.stereotype.Component;
import org.vaidik.appointment.dto.ReviewResponse;
import org.vaidik.appointment.entity.Review;

@Component
public class ReviewMapper {

    public ReviewResponse toResponse(Review review) {

        Long appointmentId = null;
        java.time.LocalDate appointmentDate = null;
        if (review.getAppointment() != null) {
            appointmentId   = review.getAppointment().getId();
            appointmentDate = review.getAppointment().getAppointmentDate();
        }

        // Business info is derived through service → business
        Long   businessId   = null;
        String businessName = null;
        if (review.getService() != null && review.getService().getBusiness() != null) {
            businessId   = review.getService().getBusiness().getId();
            businessName = review.getService().getBusiness().getName();
        }

        return ReviewResponse.builder()
                .id(review.getId())
                .rating(review.getRating())
                .comment(review.getComment())
                // User
                .userId(review.getUser().getId())
                .customerName(review.getUser().getName())
                .customerEmail(review.getUser().getEmail())
                // Service (direct association)
                .serviceId(review.getService() != null ? review.getService().getId() : null)
                .serviceName(review.getService() != null ? review.getService().getName() : null)
                // Business (derived)
                .businessId(businessId)
                .businessName(businessName)
                // Appointment
                .appointmentId(appointmentId)
                .appointmentDate(appointmentDate)
                // Soft-delete
                .removedByAdmin(review.isRemovedByAdmin())
                .removalReason(review.getRemovalReason())
                .removedAt(review.getRemovedAt())
                .build();
    }
}