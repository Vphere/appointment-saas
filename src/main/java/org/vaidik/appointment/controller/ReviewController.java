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
    public ReviewResponse createReview(@RequestBody CreateReviewRequest request,
                                       Authentication authentication) {
        return reviewService.createReview(request, authentication.getName());
    }

    // Reviews for a specific service — primary endpoint for the service detail page
    @GetMapping("/service/{serviceId}")
    public List<ReviewResponse> getServiceReviews(@PathVariable Long serviceId) {
        return reviewService.getServiceReviews(serviceId);
    }

    // Reviews for all services of a business — used on the business detail page / owner dashboard
    @GetMapping("/business/{businessId}")
    public List<ReviewResponse> getBusinessReviews(@PathVariable("businessId") Long businessId) {
        return reviewService.getBusinessReviews(businessId);
    }

    // Average rating for a specific service
    @GetMapping("/avg/service/{serviceId}")
    public Double getServiceAverage(@PathVariable Long serviceId) {
        return reviewRepository.getAverageRatingByServiceId(serviceId);
    }

    // Average rating across all services of a business
    @GetMapping("/avg/business/{businessId}")
    public Double getBusinessAverage(@PathVariable Long businessId) {
        return reviewRepository.getAverageRating(businessId);
    }

    // Check whether a review already exists for a given appointment
    @GetMapping("/check/{appointmentId}")
    public boolean hasReviewed(@PathVariable Long appointmentId) {
        return reviewRepository.existsByAppointmentId(appointmentId);
    }

    @GetMapping("/appointment/{appointmentId}")
    public ReviewResponse getReviewByAppointment(@PathVariable Long appointmentId) {
        return reviewService.getReviewByAppointment(appointmentId);
    }

    @PutMapping("/{id}")
    public ReviewResponse updateReview(@PathVariable Long id,
                                       @RequestBody CreateReviewRequest request,
                                       Authentication authentication) {
        return reviewService.updateReview(id, request, authentication.getName());
    }
}