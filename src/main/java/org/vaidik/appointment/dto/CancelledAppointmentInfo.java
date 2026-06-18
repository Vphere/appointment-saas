package org.vaidik.appointment.dto;

/**
 * Summary of a single appointment that was auto-cancelled as a side-effect
 * of a user account being deleted. Used to build the consolidated
 * "your appointments were cancelled" emails sent to both the affected
 * customer and the relevant business owner(s).
 */
public record CancelledAppointmentInfo(
        String businessName,
        String serviceName,
        String date,
        String time
) {
}