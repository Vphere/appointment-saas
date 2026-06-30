package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.CreateReviewRequest;
import org.vaidik.appointment.dto.ReviewResponse;
import org.vaidik.appointment.entity.*;
import org.vaidik.appointment.mapper.ReviewMapper;
import org.vaidik.appointment.repository.AppointmentRepository;
import org.vaidik.appointment.repository.ReviewRepository;
import org.vaidik.appointment.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ReviewMapper mapper;
    private final AppointmentRepository appointmentRepository;

    @Transactional
    public ReviewResponse createReview(CreateReviewRequest request, String userEmail) {

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        // Ownership check
        if (!appointment.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not your appointment");
        }

        // Only completed appointments can be reviewed
        if (appointment.getStatus() != AppointmentStatus.COMPLETED) {
            throw new RuntimeException("Only completed appointments can be reviewed");
        }

        // Prevent duplicate review per appointment
        if (reviewRepository.existsByAppointmentId(appointment.getId())) {
            throw new RuntimeException("Already reviewed this appointment");
        }

        Review review = Review.builder()
                .rating(request.getRating())
                .comment(request.getComment())
                .service(appointment.getService())
                .user(user)
                .appointment(appointment)
                .build();

        appointment.setReviewed(true);
        appointmentRepository.save(appointment);

        Review saved = reviewRepository.save(review);
        return mapper.toResponse(
                reviewRepository.findByIdWithFetch(saved.getId())
                        .orElse(saved)
        );
    }

    // Reviews for a specific service (used on the service detail page)
    public List<ReviewResponse> getServiceReviews(Long serviceId) {
        return reviewRepository.findByServiceId(serviceId)
                .stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
    }

    // Reviews for all services of a business (used on the business detail page / owner dashboard)
    public List<ReviewResponse> getBusinessReviews(Long businessId) {
        return reviewRepository.findByBusinessId(businessId)
                .stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ReviewResponse updateReview(Long reviewId, CreateReviewRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Review review = reviewRepository.findByIdWithFetch(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        if (!review.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not your review");
        }

        // ── Security guard: admin-removed reviews cannot be edited ──
        if (review.isRemovedByAdmin()) {
            throw new RuntimeException("This review has been removed by an administrator and cannot be edited");
        }

        review.setRating(request.getRating());
        review.setComment(request.getComment());

        return mapper.toResponse(reviewRepository.save(review));
    }

    public ReviewResponse getReviewByAppointment(Long appointmentId) {
        return reviewRepository.findByAppointmentId(appointmentId)
                .map(mapper::toResponse)
                .orElse(null);
    }
}