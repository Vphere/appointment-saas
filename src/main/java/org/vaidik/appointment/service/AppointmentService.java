package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.CreateAppointmentRequest;
import org.vaidik.appointment.dto.AppointmentResponse;
import org.vaidik.appointment.entity.*;
import org.vaidik.appointment.mapper.AppointmentMapper;
import org.vaidik.appointment.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;
    private final ServiceOfferingRepository serviceRepository;
    private final AppointmentMapper mapper;

    public AppointmentResponse bookAppointment(CreateAppointmentRequest request, String userEmail){

        boolean exists = appointmentRepository
                .existsByBusinessIdAndAppointmentDateAndAppointmentTime(
                        request.getBusinessId(),
                        request.getAppointmentDate(),
                        request.getAppointmentTime()
                );

        if (exists) {
            throw new RuntimeException("Slot already booked");
        }

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
                .createdAt(LocalDateTime.now())
                .build();

        Appointment saved = appointmentRepository.save(appointment);

        return mapper.toResponse(saved);
    }

    public List<AppointmentResponse> getUserAppointments(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return appointmentRepository.findByUserId(user.getId())
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
            Long appointmentId,
            AppointmentStatus newStatus,
            String ownerEmail
    ) {

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        // 🔥 Check ownership
        if (!appointment.getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Not authorized for this business");
        }

        AppointmentStatus currentStatus = appointment.getStatus();

        if (currentStatus == AppointmentStatus.CANCELLED ||
                currentStatus == AppointmentStatus.COMPLETED) {
            throw new RuntimeException("Cannot change status");
        }

        if (currentStatus == AppointmentStatus.PENDING &&
                (newStatus == AppointmentStatus.CONFIRMED ||
                        newStatus == AppointmentStatus.CANCELLED)) {

            appointment.setStatus(newStatus);

        } else if (currentStatus == AppointmentStatus.CONFIRMED &&
                newStatus == AppointmentStatus.COMPLETED) {

            appointment.setStatus(newStatus);

        } else {
            throw new RuntimeException("Invalid transition");
        }

        return mapper.toResponse(appointmentRepository.save(appointment));
    }
}