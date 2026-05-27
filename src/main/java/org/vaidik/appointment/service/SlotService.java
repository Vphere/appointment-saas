package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.vaidik.appointment.dto.SlotResponse;
import org.vaidik.appointment.entity.*;
import org.vaidik.appointment.repository.*;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SlotService {

    private final WorkingHoursRepository    workingHoursRepository;
    private final AppointmentRepository     appointmentRepository;
    private final BusinessHolidayRepository holidayRepository;
    private final ServiceOfferingRepository serviceOfferingRepository;

    public List<SlotResponse> getAvailableSlots(Long serviceId, LocalDate date, int requestedDuration) {

        // ── 1. Load service ───────────────────────────────────────────────
        ServiceOffering service = serviceOfferingRepository.findById(serviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found"));

        ServiceType serviceType = service.getServiceType() != null
                ? service.getServiceType()
                : ServiceType.FIXED;

        int gapMinutes = service.getGapMinutes() != null ? service.getGapMinutes() : 0;

        // ── 2. Resolve slot duration ──────────────────────────────────────
        int slotDuration;
        if (serviceType == ServiceType.FIXED) {
            slotDuration = service.getDuration() != null ? service.getDuration() : requestedDuration;
        } else {
            // CONSULTATION: slot interval = gapMinutes
            slotDuration = gapMinutes > 0 ? gapMinutes
                    : (requestedDuration > 0 ? requestedDuration : 30);
        }

        // ── CRITICAL GUARD: slotDuration must be > 0 ─────────────────────
        // A zero slotDuration causes an infinite while-loop → OutOfMemoryError.
        // This can happen for CONSULTATION services if gapMinutes was saved as 0
        // despite the create/update validation (e.g. data migrated from older schema).
        if (slotDuration <= 0) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "This service has an invalid slot duration (0 minutes). " +
                            "Please edit the service and set a Gap Between Appointments of at least 1 minute.");
        }

        int blockMinutes = serviceType == ServiceType.FIXED
                ? slotDuration + gapMinutes
                : slotDuration;

        // ── 3. Working hours ──────────────────────────────────────────────
        DayOfWeek day = date.getDayOfWeek();
        Optional<WorkingHours> workingHoursOpt =
                workingHoursRepository.findByServiceIdAndDayOfWeek(serviceId, day);

        if (workingHoursOpt.isEmpty()) return List.of();

        WorkingHours workingHours = workingHoursOpt.get();
        Long         businessId   = workingHours.getService().getBusiness().getId();

        // ── 4. Check holidays ─────────────────────────────────────────────
        boolean isHoliday = holidayRepository
                .findByBusinessIdAndServiceIdOrAllServices(businessId, serviceId)
                .stream()
                .anyMatch(h -> h.getDate().equals(date));

        if (isHoliday) return List.of();

        LocalTime start = workingHours.getStartTime();
        LocalTime end   = workingHours.getEndTime();

        // ── 5. Generate raw slots ─────────────────────────────────────────
        List<LocalTime> generatedSlots = new ArrayList<>();
        LocalTime current = start;

        // Safety cap: no more than 1440 slots (24 hours / 1 min intervals)
        int iterations = 0;
        while (!current.plusMinutes(slotDuration).isAfter(end) && iterations < 1440) {
            generatedSlots.add(current);
            current = current.plusMinutes(slotDuration);
            iterations++;
        }

        // ── 6. Filter booked slots ────────────────────────────────────────
        List<Appointment> bookings =
                appointmentRepository.findByServiceIdAndAppointmentDate(serviceId, date);

        return generatedSlots.stream()
                .filter(slot -> bookings.stream().noneMatch(booking -> {
                    LocalTime bookedStart = booking.getAppointmentTime();

                    int bookedServiceDuration = (booking.getService().getDuration() != null)
                            ? booking.getService().getDuration()
                            : slotDuration;
                    int bookedGap = (booking.getService().getGapMinutes() != null)
                            ? booking.getService().getGapMinutes()
                            : 0;

                    int bookedBlock = (booking.getService().getServiceType() == ServiceType.FIXED)
                            ? bookedServiceDuration + bookedGap
                            : bookedServiceDuration;

                    LocalTime bookedEnd = bookedStart.plusMinutes(bookedBlock);
                    LocalTime slotEnd   = slot.plusMinutes(blockMinutes);

                    return slot.isBefore(bookedEnd) && slotEnd.isAfter(bookedStart);
                }))
                .map(slot -> SlotResponse.builder().time(slot).build())
                .collect(Collectors.toList());
    }
}