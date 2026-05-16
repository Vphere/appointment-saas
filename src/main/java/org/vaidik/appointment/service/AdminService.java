package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.AdminStatsResponse;
import org.vaidik.appointment.dto.RemoveReviewRequest;
import org.vaidik.appointment.dto.ReviewResponse;
import org.vaidik.appointment.dto.UserProfileDTO;
import org.vaidik.appointment.entity.BusinessStatus;
import org.vaidik.appointment.entity.Role;
import org.vaidik.appointment.entity.AppointmentStatus;
import org.vaidik.appointment.mapper.ReviewMapper;
import org.vaidik.appointment.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final ReviewRepository reviewRepository;
    private final ReviewMapper reviewMapper;

    public AdminStatsResponse getAdminStats() {
        long totalBusinesses = businessRepository.count();
        long pending  = businessRepository.countByStatus(BusinessStatus.PENDING);
        long approved = businessRepository.countByStatus(BusinessStatus.APPROVED);
        long rejected = businessRepository.countByStatus(BusinessStatus.REJECTED);

        long totalUsers   = userRepository.count();
        long customers    = userRepository.countByRole(Role.CUSTOMER);
        long owners       = userRepository.countByRole(Role.BUSINESS_OWNER);

        long totalAppointments = appointmentRepository.count();
        long completed  = appointmentRepository.countByStatus(AppointmentStatus.COMPLETED);
        long cancelled  = appointmentRepository.countByStatus(AppointmentStatus.CANCELLED);

        long totalReviews = reviewRepository.count();
        Double avgRating  = reviewRepository.getOverallAverageRating();

        return AdminStatsResponse.builder()
                .totalBusinesses(totalBusinesses)
                .pendingBusinesses(pending)
                .approvedBusinesses(approved)
                .rejectedBusinesses(rejected)
                .totalUsers(totalUsers)
                .totalCustomers(customers)
                .totalBusinessOwners(owners)
                .totalAppointments(totalAppointments)
                .completedAppointments(completed)
                .cancelledAppointments(cancelled)
                .totalReviews(totalReviews)
                .averageRating(avgRating != null ? avgRating : 0.0)
                .build();
    }

    public List<UserProfileDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(u -> UserProfileDTO.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .email(u.getEmail())
                        .phone(u.getPhone())
                        .role(u.getRole() != null ? u.getRole().name() : "CUSTOMER")
                        .build())
                .collect(Collectors.toList());
    }

    public UserProfileDTO updateUserRole(Long userId, String newRole) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // ── SECURITY: never allow promoting/demoting SUPER_ADMIN via UI ──
        if (user.getRole() == Role.SUPER_ADMIN) {
            throw new RuntimeException("Cannot change role of a Super Admin");
        }
        if (Role.valueOf(newRole) == Role.SUPER_ADMIN) {
            throw new RuntimeException("Cannot assign Super Admin role via this interface");
        }

        user.setRole(Role.valueOf(newRole));
        userRepository.save(user);

        return UserProfileDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .build();
    }

    public void deleteUser(Long userId) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        // ── SECURITY: protect SUPER_ADMIN from deletion ──
        if (user.getRole() == Role.SUPER_ADMIN) {
            throw new RuntimeException("Cannot delete a Super Admin account");
        }
        userRepository.deleteById(userId);
    }

    public List<ReviewResponse> getAllReviews() {
        return reviewRepository.findAll().stream()
                .map(reviewMapper::toResponse)
                .collect(Collectors.toList());
    }

    // Soft-delete: mark as removed, store reason, keep data in DB
    public ReviewResponse removeReview(Long reviewId, RemoveReviewRequest request) {
        var review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        review.setRemovedByAdmin(true);
        review.setRemovalReason(request.getReason()
                + (request.getDetails() != null && !request.getDetails().isBlank()
                ? " — " + request.getDetails()
                : ""));
        review.setRemovedAt(LocalDateTime.now());

        return reviewMapper.toResponse(reviewRepository.save(review));
    }

    // Restore a soft-deleted review
    public ReviewResponse restoreReview(Long reviewId) {
        var review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        review.setRemovedByAdmin(false);
        review.setRemovalReason(null);
        review.setRemovedAt(null);

        return reviewMapper.toResponse(reviewRepository.save(review));
    }
}