package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.Hibernate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.dto.CreateAppointmentRequest;
import org.vaidik.appointment.dto.AppointmentResponse;
import org.vaidik.appointment.entity.*;
import org.vaidik.appointment.mapper.AppointmentMapper;
import org.vaidik.appointment.repository.*;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;
    private final ServiceOfferingRepository serviceRepository;
    private final ServiceCompletionConsentRepository consentRepository;
    private final AppointmentMapper mapper;
    private final EmailService emailService;
    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;

    private static final List<AppointmentStatus> FREED_STATUSES = List.of(AppointmentStatus.CANCELLED);

    @Transactional
    public AppointmentResponse bookAppointment(CreateAppointmentRequest request, String userEmail) {

        ServiceOffering service = serviceRepository.findByIdForUpdate(request.getServiceId())
                .orElseThrow(() -> new RuntimeException("Service not found"));

        boolean exists = appointmentRepository.existsActiveByServiceDateAndTime(
                request.getServiceId(),
                request.getAppointmentDate(),
                request.getAppointmentTime(),
                FREED_STATUSES
        );
        if (exists) {
            throw new RuntimeException("This time slot is already taken. Please choose another time.");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Business business = businessRepository.findById(request.getBusinessId())
                .orElseThrow(() -> new RuntimeException("Business not found"));

        Appointment appointment = Appointment.builder()
                .user(user)
                .business(business)
                .service(service)
                .appointmentDate(request.getAppointmentDate())
                .appointmentTime(request.getAppointmentTime())
                .status(AppointmentStatus.PENDING)
                .paymentStatus(PaymentStatus.PENDING_PAYMENT)
                .reviewed(false)
                .build();

        try {
            Appointment saved = appointmentRepository.save(appointment);
            return mapper.toResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            // Layer 2: DB-level constraint violation (rare race-condition safety net)
            log.warn("Double-booking attempt caught at DB level for serviceId={}, date={}, time={}",
                    request.getServiceId(), request.getAppointmentDate(), request.getAppointmentTime());
            throw new RuntimeException("This time slot was just taken by another user. Please choose a different time.");
        }
    }

    public List<AppointmentResponse> getUserAppointments(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return appointmentRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    public List<AppointmentResponse> getAppointmentsForOwner(String ownerEmail) {
        User owner = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new RuntimeException("Owner not found"));
        return appointmentRepository.findByOwnerIdWithJoinFetch(owner.getId())
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional
    public AppointmentResponse updateAppointmentStatus(
            Long appointmentId, AppointmentStatus newStatus, String ownerEmail
    ) {
        User requestingUser = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + ownerEmail));

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        String businessOwnerEmail = appointment.getBusiness().getOwner().getEmail();
        if (!businessOwnerEmail.equals(ownerEmail)) {
            throw new RuntimeException("Not authorized for this business.");
        }
        if (requestingUser.getRole() != Role.BUSINESS_OWNER) {
            throw new RuntimeException("Only business owners can update appointment status.");
        }

        AppointmentStatus currentStatus = appointment.getStatus();
        PaymentStatus currentPayment   = appointment.getPaymentStatus();

        if (currentStatus == AppointmentStatus.CANCELLED ||
                currentStatus == AppointmentStatus.COMPLETED) {
            throw new RuntimeException("Cannot change status of a " + formatStatus(currentStatus) + " appointment.");
        }

        // ── GUARD: Owner cannot CONFIRM an appointment where the deposit was never paid ──
        if (newStatus == AppointmentStatus.CONFIRMED) {
            if (currentPayment == PaymentStatus.PENDING_PAYMENT) {
                throw new RuntimeException(
                        "Cannot confirm this appointment — the customer has not completed the deposit payment. " +
                                "Ask the customer to complete payment before you confirm.");
            }
        }

        if (currentStatus == AppointmentStatus.PENDING &&
                (newStatus == AppointmentStatus.CONFIRMED || newStatus == AppointmentStatus.CANCELLED)) {
            appointment.setStatus(newStatus);
        } else if (currentStatus == AppointmentStatus.AWAITING_REMAINING_PAYMENT
                && newStatus == AppointmentStatus.COMPLETED) {
            appointment.setStatus(newStatus);
            appointment.setPaymentStatus(PaymentStatus.COMPLETED);
        } else {
            throw new RuntimeException("Invalid status transition from " + formatStatus(currentStatus) + " to " + formatStatus(newStatus) + ".");
        }

        Appointment saved = appointmentRepository.save(appointment);

        // If the owner cancels and the customer had already paid the deposit, refund them.
        if (newStatus == AppointmentStatus.CANCELLED) {
            PaymentStatus ps = saved.getPaymentStatus();
            if (ps == PaymentStatus.DEPOSIT_PAID || ps == PaymentStatus.CONFIRMED) {
                try {
                    paymentService.initiateRefund(saved);
                } catch (Exception e) {
                    log.error("Refund initiation failed (owner cancel) for appointmentId={}: {}", appointmentId, e.getMessage());
                }
            }
        }

        Hibernate.initialize(saved.getUser());
        Hibernate.initialize(saved.getBusiness());
        Hibernate.initialize(saved.getService());

        try {
            if (newStatus == AppointmentStatus.CONFIRMED) {
                emailService.sendServiceConfirmedEmail(saved);
            } else {
                emailService.sendStatusChangeEmail(saved);
            }
        } catch (Exception e) {
            log.error("Status change email failed for appointmentId={}: {}", appointmentId, e.getMessage());
        }

        return mapper.toResponse(saved);
    }

    @Transactional
    public AppointmentResponse cancelByUser(Long id, String email) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getUser().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized");
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED ||
                appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new RuntimeException("Cannot cancel a " +
                    formatStatus(appointment.getStatus()) + " appointment.");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        Appointment saved = appointmentRepository.save(appointment);

        PaymentStatus ps = appointment.getPaymentStatus();
        if (ps == PaymentStatus.DEPOSIT_PAID ||
                ps == PaymentStatus.CONFIRMED ||
                ps == PaymentStatus.RESCHEDULED ||
                ps == PaymentStatus.AWAITING_CONSENT) {
            try {
                paymentService.initiateRefund(saved);
            } catch (Exception e) {
                log.error("Refund initiation failed for appointmentId={}: {}", id, e.getMessage());
            }
        }

        Hibernate.initialize(saved.getUser());
        Hibernate.initialize(saved.getBusiness());
        Hibernate.initialize(saved.getService());
        Hibernate.initialize(saved.getBusiness().getOwner());

        try {
            emailService.sendCancellationByUserEmail(saved);
        } catch (Exception e) {
            log.error("Cancellation email failed for appointmentId={}: {}", id, e.getMessage());
        }

        return mapper.toResponse(saved);
    }

    @Transactional
    public AppointmentResponse rescheduleAppointment(Long id, CreateAppointmentRequest request, String email) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getUser().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized");
        }
        if (appointment.getStatus() != AppointmentStatus.PENDING &&
                appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new RuntimeException("Only pending or confirmed appointments can be rescheduled.");
        }

        if (appointment.getPaymentStatus() == PaymentStatus.PENDING_PAYMENT) {
            throw new RuntimeException(
                    "Please complete your deposit payment before rescheduling. " +
                            "Your slot is temporarily reserved but not confirmed.");
        }

        if (appointment.getRescheduleCount() >= 2) {
            throw new RuntimeException(
                    "You have reached the maximum reschedule limit (2). Please cancel and rebook if needed.");
        }

        java.time.LocalDateTime appointmentDateTime = java.time.LocalDateTime.of(
                appointment.getAppointmentDate(), appointment.getAppointmentTime());
        long hoursUntil = java.time.Duration.between(
                java.time.LocalDateTime.now(), appointmentDateTime).toHours();

        if (hoursUntil < 24) {
            throw new RuntimeException(
                    "Rescheduling is not allowed within 24 hours of the appointment. " +
                            "If you cancel now, no refund will be issued.");
        }

        // Pessimistic-locked check for the new slot
        boolean slotTaken = appointmentRepository.existsActiveByServiceDateAndTime(
                request.getServiceId(),
                request.getAppointmentDate(),
                request.getAppointmentTime(),
                FREED_STATUSES
        );
        boolean conflictIsWithSelf =
                appointment.getService().getId().equals(request.getServiceId()) &&
                        appointment.getAppointmentDate().equals(request.getAppointmentDate()) &&
                        appointment.getAppointmentTime().equals(request.getAppointmentTime());

        if (slotTaken && !conflictIsWithSelf) {
            throw new RuntimeException("That slot is already booked. Please choose another time.");
        }

        if (appointment.getRescheduleCount() == 0) {
            appointment.setOriginalAppointmentDate(appointment.getAppointmentDate());
            appointment.setOriginalAppointmentTime(appointment.getAppointmentTime());
        }

        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setAppointmentTime(request.getAppointmentTime());
        appointment.setStatus(AppointmentStatus.PENDING);
        appointment.setReminderSent(false);
        appointment.setRescheduleCount(appointment.getRescheduleCount() + 1);
        appointment.setPaymentStatus(PaymentStatus.RESCHEDULED);

        return mapper.toResponse(appointmentRepository.save(appointment));
    }

    @Transactional
    public AppointmentResponse markRemainingPaid(Long appointmentId, String ownerEmail) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Not authorized");
        }

        if (appointment.getStatus() != AppointmentStatus.AWAITING_REMAINING_PAYMENT) {
            throw new RuntimeException("This appointment is not awaiting remaining payment. " +
                    "The customer must first confirm the service via OTP or email link.");
        }

        var consent = consentRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new RuntimeException(
                        "Cannot complete: no service completion consent record found. " +
                                "The customer must confirm the service via OTP or the email link first."));

        if (!Boolean.TRUE.equals(consent.getIsUsed())) {
            throw new RuntimeException(
                    "Cannot complete: the customer has not yet confirmed the service. " +
                            "Please ask the customer to confirm using their OTP or the email link.");
        }

        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment.setPaymentStatus(PaymentStatus.COMPLETED);
        Appointment saved = appointmentRepository.save(appointment);

        Hibernate.initialize(saved.getUser());
        Hibernate.initialize(saved.getBusiness());
        Hibernate.initialize(saved.getService());

        try {
            emailService.sendServiceCompletedEmail(saved);
        } catch (Exception e) {
            log.error("Completion email failed for appointmentId={}: {}", appointmentId, e.getMessage());
        }

        return mapper.toResponse(saved);
    }

    private String formatStatus(AppointmentStatus status) {
        return status.name().replace('_', ' ').toLowerCase();
    }
}