package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.entity.Appointment;
import org.vaidik.appointment.entity.AppointmentStatus;
import org.vaidik.appointment.entity.PaymentStatus;
import org.vaidik.appointment.repository.AppointmentRepository;
import org.vaidik.appointment.repository.PaymentRepository;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentTimeoutScheduler {

    private static final int PAYMENT_WINDOW_MINUTES = 20;

    private final AppointmentRepository appointmentRepository;
    private final PaymentRepository     paymentRepository;
    private final EmailService          emailService;

    @Transactional
    @Scheduled(fixedRate = 8 * 60 * 1000)
    public void releaseExpiredUnpaidSlots() {

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(PAYMENT_WINDOW_MINUTES);

        List<Appointment> expired = appointmentRepository.findExpiredPendingPayments(
                PaymentStatus.PENDING_PAYMENT,
                AppointmentStatus.PENDING,
                cutoff
        );

        if (expired.isEmpty()) return;

        log.info("PaymentTimeoutScheduler: releasing {} expired unpaid slot(s)", expired.size());

        for (Appointment appt : expired) {
            try {
                // Cancel — this frees the slot for anyone else to book
                appt.setStatus(AppointmentStatus.CANCELLED);
                appt.setPaymentStatus(PaymentStatus.CANCELLED_NO_REFUND); // nothing charged
                appointmentRepository.save(appt);

                // Delete any stale CREATED payment record (no money was charged,
                // use direct bulk delete to avoid StaleStateException)
                paymentRepository.deleteByAppointmentIdDirect(appt.getId());

                log.info("Released slot → appointmentId={} serviceId={} date={} time={}",
                        appt.getId(),
                        appt.getService().getId(),
                        appt.getAppointmentDate(),
                        appt.getAppointmentTime());

                // Notify user their reservation lapsed
                try {
                    emailService.sendSlotExpiredEmail(appt);
                } catch (Exception emailEx) {
                    log.warn("Slot-expired email failed for appointmentId={}: {}",
                            appt.getId(), emailEx.getMessage());
                }

            } catch (Exception e) {
                log.error("Failed to release expired slot for appointmentId={}: {}",
                        appt.getId(), e.getMessage());
            }
        }
    }

    @Transactional
    @Scheduled(fixedRate = 5 * 60 * 1000)
    public void sendDepositNudgeEmails() {

        LocalDateTime nudgeTo   = LocalDateTime.now().minusMinutes(10);
        LocalDateTime nudgeFrom = LocalDateTime.now().minusMinutes(12);

        List<Appointment> due = appointmentRepository.findAppointmentsNeedingDepositNudge(
                PaymentStatus.PENDING_PAYMENT,
                AppointmentStatus.PENDING,
                nudgeFrom,
                nudgeTo
        );

        if (due.isEmpty()) return;

        log.info("Deposit nudge scheduler: {} appointment(s) approaching expiry", due.size());

        for (Appointment appt : due) {
            try {
                int minutesLeft = PAYMENT_WINDOW_MINUTES
                        - (int) java.time.Duration.between(appt.getCreatedAt(), LocalDateTime.now()).toMinutes();
                if (minutesLeft < 1) minutesLeft = 1;

                emailService.sendDepositNudgeEmail(appt, minutesLeft);

                appt.setDepositNudgeSent(true);
                appointmentRepository.save(appt);

                log.info("Deposit nudge sent → appointmentId={} minutesLeft={}",
                        appt.getId(), minutesLeft);
            } catch (Exception e) {
                log.error("Failed to send deposit nudge for appointmentId={}: {}",
                        appt.getId(), e.getMessage());
            }
        }
    }

}