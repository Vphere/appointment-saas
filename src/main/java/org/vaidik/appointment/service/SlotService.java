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

    public List<SlotResponse> getAvailableSlots(Long serviceId,
                                                LocalDate date,
                                                int requestedDuration) {

        // ── 1. Load service ───────────────────────────────────────
        ServiceOffering service = serviceOfferingRepository.findById(serviceId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Service not found"));

        ServiceType serviceType = service.getServiceType() != null
                ? service.getServiceType()
                : ServiceType.FIXED;

        int gapMinutes = service.getGapMinutes() != null
                ? service.getGapMinutes()
                : 0;

        int slotDuration; // actual service duration shown to the customer
        int blockMinutes; // total time blocked per booking (duration + gap)
        int advancement;  // how many minutes to advance to find the next slot start

        if (serviceType == ServiceType.FIXED) {
            slotDuration = service.getDuration() != null
                    ? service.getDuration()
                    : requestedDuration;
            blockMinutes = slotDuration + gapMinutes;
            advancement  = blockMinutes;
        } else {
            // CONSULTATION — gapMinutes IS the slot interval
            slotDuration = gapMinutes > 0 ? gapMinutes
                    : (requestedDuration > 0 ? requestedDuration : 30);
            blockMinutes = slotDuration;
            advancement  = slotDuration;
        }

        // Guard: advancement must be > 0 to avoid infinite loop
        if (advancement <= 0) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "This service has an invalid slot duration (0 minutes). " +
                            "Please edit the service and set a valid duration.");
        }

        // ── 3. Working hours ──────────────────────────────────────
        DayOfWeek day = date.getDayOfWeek();
        Optional<WorkingHours> workingHoursOpt =
                workingHoursRepository.findByServiceIdAndDayOfWeek(serviceId, day);

        if (workingHoursOpt.isEmpty()) return List.of();

        WorkingHours workingHours = workingHoursOpt.get();
        if (!workingHours.isOpen())
            return List.of();

        Long businessId   = workingHours.getService().getBusiness().getId();

        // ── 4. Holiday check ──────────────────────────────────────
        boolean isHoliday = holidayRepository
                .findByBusinessIdAndServiceIdOrAllServices(businessId, serviceId)
                .stream()
                .anyMatch(h -> h.getDate().equals(date));

        if (isHoliday) return List.of();

        LocalTime start = workingHours.getStartTime();
        LocalTime end   = workingHours.getEndTime();

        // ── 5. Generate slots ─────────────────────────────────────

        List<LocalTime> generatedSlots = new ArrayList<>();
        LocalTime current = start;
        int iterations = 0;

        while (iterations < 1440) {
            // Slot is only valid if the full block fits before closing
            if (current.plusMinutes(blockMinutes).isAfter(end)) break;
            generatedSlots.add(current);
            current = current.plusMinutes(advancement);
            iterations++;
        }

        if (date.equals(LocalDate.now())) {
            LocalTime now = LocalTime.now();
            generatedSlots.removeIf(slot -> !slot.isAfter(now));
        }

        // ── 6. Filter out booked slots ────────────────────────────
        List<Appointment> bookings = appointmentRepository
                .findByServiceIdAndAppointmentDate(serviceId, date);

        // Only consider active bookings — cancelled ones free up the slot
        List<Appointment> activeBookings = bookings.stream()
                .filter(b -> b.getStatus() != AppointmentStatus.CANCELLED)
                .collect(Collectors.toList());

        return generatedSlots.stream()
                .filter(slot -> activeBookings.stream().noneMatch(booking -> {
                    LocalTime bookedStart = booking.getAppointmentTime();

                    int bookedDuration = (booking.getService().getDuration() != null)
                            ? booking.getService().getDuration()
                            : slotDuration;
                    int bookedGap = (booking.getService().getGapMinutes() != null)
                            ? booking.getService().getGapMinutes()
                            : 0;
                    ServiceType bookedType = booking.getService().getServiceType() != null
                            ? booking.getService().getServiceType()
                            : ServiceType.FIXED;

                    int bookedBlock = (bookedType == ServiceType.FIXED)
                            ? bookedDuration + bookedGap
                            : bookedDuration;

                    LocalTime bookedEnd = bookedStart.plusMinutes(bookedBlock);
                    LocalTime slotEnd   = slot.plusMinutes(blockMinutes);

                    // Overlap: slot starts before booking ends AND slot ends after booking starts
                    return slot.isBefore(bookedEnd) && slotEnd.isAfter(bookedStart);
                }))
                .map(slot -> SlotResponse.builder().time(slot).build())
                .collect(Collectors.toList());
    }
}