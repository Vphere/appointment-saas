package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.CreateReviewRequest;
import org.vaidik.appointment.dto.ReviewResponse;
import org.vaidik.appointment.repository.ReviewRepository;
import org.vaidik.appointment.service.ReviewService;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final ReviewRepository reviewRepository;

    @PostMapping
    public ReviewResponse createReview(@RequestBody CreateReviewRequest request, Authentication authentication) {

        return reviewService.createReview(request, authentication.getName());
    }

    @GetMapping("/business/{businessId}")
    public List<ReviewResponse> getBusinessReviews(@PathVariable Long businessId) {

        return reviewService.getBusinessReviews(businessId);
    }

    @GetMapping("/check/{appointmentId}")
    public boolean hasReviewed(@PathVariable Long appointmentId) {

        return reviewRepository.existsByAppointmentId(appointmentId);
    }

    @GetMapping("/avg/{businessId}")
    public Double getAverage(@PathVariable Long businessId) {
        return reviewRepository.getAverageRating(businessId);
    }
}