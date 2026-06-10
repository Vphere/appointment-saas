package org.vaidik.appointment.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.vaidik.appointment.entity.Appointment;
import org.vaidik.appointment.entity.AppointmentStatus;
import org.vaidik.appointment.repository.AppointmentRepository;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AppointmentReminderScheduler {

    private final AppointmentRepository appointmentRepository;
    private final EmailService emailService;

    /**
     * Runs every 30 minutes in production.
     * Finds any appointment whose datetime falls between NOW and NOW+24h
     * that hasn't had a reminder sent yet.
     */
    @Transactional
    @Scheduled(fixedRate = 30 * 60 * 1000)
    public void sendDynamicReminders() {

        LocalDateTime now       = LocalDateTime.now();
        LocalDateTime in24Hours = now.plusHours(24);

        log.info("Reminder scheduler running — window: {} → {}", now, in24Hours);

        List<Appointment> due = appointmentRepository.findAppointmentsDueForReminder(
                now,
                in24Hours,
                List.of(AppointmentStatus.CONFIRMED.name(), AppointmentStatus.PENDING.name())
        );

        log.info("Found {} appointment(s) due for reminder", due.size());

        for (Appointment appointment : due) {
            try {
                emailService.sendReminderEmail(appointment);
                appointment.setReminderSent(true);       // mark BEFORE saving
                appointmentRepository.save(appointment); // persist flag to DB
                log.info("Reminder sent → appointmentId={} user={} at={}T{}",
                        appointment.getId(),
                        appointment.getUser().getEmail(),
                        appointment.getAppointmentDate(),
                        appointment.getAppointmentTime());
            } catch (Exception e) {
                // reminderSent stays false → will retry on next scheduler run
                log.error("Failed to send reminder for appointmentId={}: {}",
                        appointment.getId(), e.getMessage());
            }
        }
    }
}