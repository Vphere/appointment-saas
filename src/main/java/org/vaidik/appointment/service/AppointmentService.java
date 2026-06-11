package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.CreateAppointmentRequest;
import org.vaidik.appointment.dto.AppointmentResponse;
import org.vaidik.appointment.entity.*;
import org.vaidik.appointment.mapper.AppointmentMapper;
import org.vaidik.appointment.repository.*;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;
    private final ServiceOfferingRepository serviceRepository;
    private final AppointmentMapper mapper;
    private final EmailService emailService;
    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;

    private static final List<AppointmentStatus> FREED_STATUSES = List.of(AppointmentStatus.CANCELLED);

    public AppointmentResponse bookAppointment(CreateAppointmentRequest request, String userEmail) {

        boolean exists = appointmentRepository.existsActiveByServiceDateAndTime(
                request.getServiceId(),
                request.getAppointmentDate(),
                request.getAppointmentTime(),
                FREED_STATUSES
        );
        if (exists) throw new RuntimeException("Slot already booked");

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Business business = businessRepository.findById(request.getBusinessId())
                .orElseThrow(() -> new RuntimeException("Business not found"));

        ServiceOffering service = serviceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new RuntimeException("Service not found"));

        Appointment appointment = Appointment.builder()
                .user(user)
                .business(business)
                .service(service)
                .appointmentDate(request.getAppointmentDate())
                .appointmentTime(request.getAppointmentTime())
                .status(AppointmentStatus.PENDING)
                .reviewed(false)
                .build();

        Appointment saved = appointmentRepository.save(appointment);

        // No email sent here, User will be notified when owner confirms or rejects.

        return mapper.toResponse(saved);
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
        List<Business> businesses = businessRepository.findByOwnerId(owner.getId());
        return businesses.stream()
                .flatMap(b -> appointmentRepository.findByBusinessId(b.getId()).stream())
                .map(mapper::toResponse)
                .toList();
    }

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

        if (currentStatus == AppointmentStatus.CANCELLED ||
                currentStatus == AppointmentStatus.COMPLETED) {
            throw new RuntimeException("Cannot change status");
        }

        if (currentStatus == AppointmentStatus.PENDING &&
                (newStatus == AppointmentStatus.CONFIRMED || newStatus == AppointmentStatus.CANCELLED)) {
            appointment.setStatus(newStatus);
        }
        else if (currentStatus == AppointmentStatus.AWAITING_REMAINING_PAYMENT
                && newStatus == AppointmentStatus.COMPLETED) {
            appointment.setStatus(newStatus);
            appointment.setPaymentStatus(PaymentStatus.COMPLETED);
        }
        else {
            throw new RuntimeException("Invalid transition from " + currentStatus + " to " + newStatus);
        }

        Appointment saved = appointmentRepository.save(appointment);

        // Email fires on every meaningful owner action to user
        try {
            emailService.sendStatusChangeEmail(saved);
        } catch (Exception e) {
            System.err.println("Status change email failed: " + e.getMessage());
        }

        return mapper.toResponse(saved);
    }

    public AppointmentResponse cancelByUser(Long id, String email) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getUser().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized");
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED ||
                appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new RuntimeException("Cannot cancel a " +
                    appointment.getStatus().name().toLowerCase() + " appointment");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        Appointment saved = appointmentRepository.save(appointment);

        // Trigger refund if deposit was paid
        if (appointment.getPaymentStatus() == PaymentStatus.DEPOSIT_PAID ||
                appointment.getPaymentStatus() == PaymentStatus.CONFIRMED) {
            try {
                paymentService.initiateRefund(saved);
            } catch (Exception e) {
                System.err.println("Refund initiation failed: " + e.getMessage());
            }
        }

        try {
            emailService.sendCancellationByUserEmail(saved);
        } catch (Exception e) {
            System.err.println("Owner cancellation notification failed: " + e.getMessage());
        }

        return mapper.toResponse(saved);
    }

    public AppointmentResponse rescheduleAppointment(Long id, CreateAppointmentRequest request, String email) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getUser().getEmail().equals(email)) {
            throw new RuntimeException("Unauthorized");
        }
        if (appointment.getStatus() != AppointmentStatus.PENDING &&
                appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new RuntimeException("Only pending or confirmed appointments can be rescheduled");
        }

        // Enforce 2-reschedule cap
        if (appointment.getRescheduleCount() >= 2) {
            throw new RuntimeException(
                    "Maximum reschedule limit (2) reached. Please cancel and rebook if needed.");
        }

        // Enforce 24-hour gate
        java.time.LocalDateTime appointmentDateTime = java.time.LocalDateTime.of(
                appointment.getAppointmentDate(), appointment.getAppointmentTime());
        long hoursUntil = java.time.Duration.between(
                java.time.LocalDateTime.now(), appointmentDateTime).toHours();

        if (hoursUntil < 24) {
            throw new RuntimeException(
                    "Rescheduling is not allowed within 24 hours of the appointment. " +
                            "If you cancel now, no refund will be issued.");
        }

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

        // Save original date/time on first reschedule
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

    public AppointmentResponse markRemainingPaid(Long appointmentId, String ownerEmail) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Not authorized");
        }

        if (appointment.getStatus() != AppointmentStatus.AWAITING_REMAINING_PAYMENT) {
            throw new RuntimeException("Appointment is not awaiting remaining payment");
        }

        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment.setPaymentStatus(PaymentStatus.COMPLETED);
        Appointment saved = appointmentRepository.save(appointment);

        try {
            emailService.sendServiceCompletedEmail(saved);
        } catch (Exception e) {
            System.err.println("Completion email failed: " + e.getMessage());
        }

        return mapper.toResponse(saved);
    }
}