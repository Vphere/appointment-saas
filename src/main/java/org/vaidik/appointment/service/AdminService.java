package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.dto.AdminStatsResponse;
import org.vaidik.appointment.dto.CancelledAppointmentInfo;
import org.vaidik.appointment.dto.RemoveReviewRequest;
import org.vaidik.appointment.dto.ReviewResponse;
import org.vaidik.appointment.dto.UserProfileDTO;
import org.vaidik.appointment.entity.Appointment;
import org.vaidik.appointment.entity.AppointmentStatus;
import org.vaidik.appointment.entity.BusinessStatus;
import org.vaidik.appointment.entity.Role;
import org.vaidik.appointment.entity.User;
import org.vaidik.appointment.mapper.ReviewMapper;
import org.vaidik.appointment.repository.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final ReviewRepository reviewRepository;
    private final ReviewMapper reviewMapper;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ServiceCompletionConsentRepository serviceCompletionConsentRepository;
    private final OtpRepository otpRepository;
    private final EmailService emailService;
    private final PaymentService paymentService;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    /** Appointment states that still represent a "live" booking and must be cancelled on account deletion. */
    private static final List<AppointmentStatus> CANCELLABLE_STATUSES = List.of(
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.AWAITING_REMAINING_PAYMENT
    );

    // ── Stats ───────────────────────────────────────────────────────────────

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

    // ── User management ─────────────────────────────────────────────────────

    public List<UserProfileDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toUserDTO)
                .collect(Collectors.toList());
    }

    public UserProfileDTO updateUserRole(Long userId, String newRole) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() == Role.SUPER_ADMIN) {
            throw new RuntimeException("Cannot change role of a Super Admin");
        }
        if (Role.valueOf(newRole) == Role.SUPER_ADMIN) {
            throw new RuntimeException("Cannot assign Super Admin role via this interface");
        }

        user.setRole(Role.valueOf(newRole));
        userRepository.save(user);
        return toUserDTO(user);
    }

    /**
     * Soft-deletes a user — preserves all historical data (appointments,
     * payments, reviews) for analytics and financial audit.
     *
     * Side effects:
     *   - Any of the user's PENDING / CONFIRMED / AWAITING_REMAINING_PAYMENT
     *     appointments are cancelled. A refund is attempted (best-effort)
     *     for any that had a deposit/payment captured — same policy as a
     *     customer-initiated cancellation.
     *   - The user receives ONE consolidated email listing every appointment
     *     that was cancelled as a result.
     *   - Each affected business owner receives ONE consolidated email
     *     listing the appointment(s) of this customer that were cancelled
     *     at their business.
     *
     * Only truly ephemeral / session data is hard-deleted:
     *   - refresh_tokens  (session tokens, zero value after logout)
     *   - otps            (one-time codes, already expired)
     *   - service_completion_consents  (operational tokens, already used/expired)
     *
     * Everything else stays in the DB with the user row flagged deleted.
     * The user simply cannot log in anymore (see AuthService / CustomUserDetailsService).
     */
    @Transactional
    public UserProfileDTO deleteUser(Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() == Role.SUPER_ADMIN) {
            throw new RuntimeException("Cannot delete a Super Admin account");
        }
        if (user.isDeleted()) {
            throw new RuntimeException("User is already deactivated");
        }

        String trimmedReason = (reason != null && !reason.isBlank())
                ? reason.trim()
                : "Account removed by administrator.";

        // ── Cancel all of this user's live appointments, grouping a per-owner summary ──
        List<CancelledAppointmentInfo> userCancelledSummaries = new ArrayList<>();
        Map<String, OwnerCancellationBatch> ownerBatches = new LinkedHashMap<>();

        List<Appointment> activeAppointments =
                appointmentRepository.findByUserIdAndStatusInWithJoinFetch(userId, CANCELLABLE_STATUSES);

        for (Appointment appointment : activeAppointments) {
            appointment.setStatus(AppointmentStatus.CANCELLED);
            appointmentRepository.save(appointment);

            // Best-effort refund, same policy as a customer-initiated cancellation.
            try {
                paymentService.initiateRefund(appointment);
            } catch (Exception e) {
                System.err.println("Refund initiation failed during user deletion (appointment #"
                        + appointment.getId() + "): " + e.getMessage());
            }

            CancelledAppointmentInfo summary = new CancelledAppointmentInfo(
                    appointment.getBusiness().getName(),
                    appointment.getService() != null ? appointment.getService().getName() : "—",
                    appointment.getAppointmentDate().format(DATE_FMT),
                    appointment.getAppointmentTime().format(TIME_FMT)
            );
            userCancelledSummaries.add(summary);

            User owner = appointment.getBusiness().getOwner();
            ownerBatches
                    .computeIfAbsent(owner.getEmail(), key -> new OwnerCancellationBatch(
                            owner.getName() != null ? owner.getName() : owner.getEmail(),
                            new ArrayList<>()))
                    .summaries()
                    .add(summary);
        }

        // ── Hard delete: pure session / ephemeral tokens ─────────────────
        refreshTokenRepository.deleteByUser(user);
        otpRepository.deleteByEmail(user.getEmail());
        serviceCompletionConsentRepository.deleteByAppointmentUserId(userId);

        // ── Soft delete: flag the user row ────────────────────────────────
        // appointments, payments, reviews stay intact
        user.setDeletedAt(LocalDateTime.now());
        user.setDeletionReason(trimmedReason);
        userRepository.save(user);

        // ── Notify the deleted user — ONE email with all cancelled appointments ──
        emailService.sendAccountDeletionEmail(
                user.getEmail(),
                user.getName() != null ? user.getName() : user.getEmail(),
                trimmedReason,
                userCancelledSummaries
        );

        // ── Notify each affected business owner — ONE email per owner ──────
        String customerName = user.getName() != null ? user.getName() : user.getEmail();
        for (Map.Entry<String, OwnerCancellationBatch> entry : ownerBatches.entrySet()) {
            OwnerCancellationBatch batch = entry.getValue();
            emailService.sendAppointmentsCancelledForDeletedUserEmail(
                    entry.getKey(),
                    batch.ownerName(),
                    customerName,
                    batch.summaries()
            );
        }

        return toUserDTO(user);
    }

    /**
     * Restores a soft-deleted user — clears all deletion flags.
     * The user can log in again immediately. Appointments that were
     * cancelled at deletion time are NOT automatically restored.
     */
    @Transactional
    public UserProfileDTO restoreUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.isDeleted()) {
            throw new RuntimeException("User is not deactivated");
        }

        user.setDeletedAt(null);
        user.setDeletionReason(null);
        userRepository.save(user);

        emailService.sendAccountRestoredEmail(
                user.getEmail(),
                user.getName() != null ? user.getName() : user.getEmail()
        );

        return toUserDTO(user);
    }

    // ── Review moderation ────────────────────────────────────────────────────

    public List<ReviewResponse> getAllReviews() {
        return reviewRepository.findAll().stream()
                .map(reviewMapper::toResponse)
                .collect(Collectors.toList());
    }

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

    public ReviewResponse restoreReview(Long reviewId) {
        var review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        review.setRemovedByAdmin(false);
        review.setRemovalReason(null);
        review.setRemovedAt(null);

        return reviewMapper.toResponse(reviewRepository.save(review));
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private UserProfileDTO toUserDTO(User u) {
        return UserProfileDTO.builder()
                .id(u.getId())
                .name(u.getName())
                .email(u.getEmail())
                .phone(u.getPhone())
                .role(u.getRole() != null ? u.getRole().name() : "CUSTOMER")
                .deleted(u.isDeleted())
                .deletedAt(u.getDeletedAt())
                .deletionReason(u.getDeletionReason())
                .build();
    }

    /** Accumulator: appointments of the deleted customer cancelled at one specific owner's business(es). */
    private record OwnerCancellationBatch(String ownerName, List<CancelledAppointmentInfo> summaries) {}
}