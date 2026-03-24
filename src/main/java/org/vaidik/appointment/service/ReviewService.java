package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.CreateReviewRequest;
import org.vaidik.appointment.dto.ReviewResponse;
import org.vaidik.appointment.entity.*;
import org.vaidik.appointment.mapper.ReviewMapper;
import org.vaidik.appointment.repository.AppointmentRepository;
import org.vaidik.appointment.repository.BusinessRepository;
import org.vaidik.appointment.repository.ReviewRepository;
import org.vaidik.appointment.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final ReviewMapper mapper;
    private final AppointmentRepository appointmentRepository;

    public ReviewResponse createReview(CreateReviewRequest request, String userEmail) {

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        // 🔥 Ownership check
        if (!appointment.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not your appointment");
        }

        // 🔥 Only completed allowed
        if (appointment.getStatus() != AppointmentStatus.COMPLETED) {
            throw new RuntimeException("Only completed appointments can be reviewed");
        }

        // 🔥 Prevent duplicate review PER APPOINTMENT
        boolean alreadyReviewed = reviewRepository.existsByAppointmentId(appointment.getId());

        if (alreadyReviewed) {
            throw new RuntimeException("Already reviewed this appointment");
        }

        Review review = Review.builder()
                .rating(request.getRating())
                .comment(request.getComment())
                .business(appointment.getBusiness())
                .user(user)
                .appointment(appointment)   // 🔥 IMPORTANT
                .build();

        return mapper.toResponse(reviewRepository.save(review));
    }

    public List<ReviewResponse> getBusinessReviews(Long businessId) {

        return reviewRepository.findByBusinessId(businessId)
                .stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
    }
}