package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.SlotResponse;
import org.vaidik.appointment.entity.Appointment;
import org.vaidik.appointment.entity.WorkingHours;
import org.vaidik.appointment.repository.AppointmentRepository;
import org.vaidik.appointment.repository.WorkingHoursRepository;

import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SlotService {

    private final WorkingHoursRepository workingHoursRepository;
    private final AppointmentRepository appointmentRepository;

    public List<SlotResponse> getAvailableSlots(Long businessId, LocalDate date, int serviceDuration) {

        DayOfWeek day = date.getDayOfWeek();

        WorkingHours workingHours = workingHoursRepository.findByBusinessIdAndDayOfWeek(businessId, day)
                                    .orElseThrow(() -> new RuntimeException("Business closed"));

        LocalTime start = workingHours.getStartTime();
        LocalTime end = workingHours.getEndTime();
        List<LocalTime> generatedSlots = new ArrayList<>();
        LocalTime current = start;

        while (!current.plusMinutes(serviceDuration).isAfter(end)) {

            generatedSlots.add(current);
            current = current.plusMinutes(serviceDuration);
        }

        List<Appointment> bookings = appointmentRepository.findByBusinessIdAndAppointmentDate(
                                        businessId,
                                        date
                                    );

        List<LocalTime> bookedTimes = bookings.stream()
                                        .map(Appointment::getAppointmentTime)
                                        .collect(Collectors.toList());

        return generatedSlots.stream()
                .filter(slot -> bookings.stream().noneMatch(booking -> {

                    LocalTime bookedStart = booking.getAppointmentTime();
                    LocalTime bookedEnd = bookedStart.plusMinutes(
                            booking.getService().getDuration()
                    );

                    LocalTime slotEnd = slot.plusMinutes(serviceDuration);

                    return slot.isBefore(bookedEnd) && slotEnd.isAfter(bookedStart);
                }))
                .map(slot -> SlotResponse.builder().time(slot).build())
                .collect(Collectors.toList());
    }
}