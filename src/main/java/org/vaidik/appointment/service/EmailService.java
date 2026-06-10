package org.vaidik.appointment.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.entity.Appointment;

import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    public void sendOtpEmail(String toEmail, String otp) {
        String subject = "Your Password Reset OTP";

        String html = """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width,initial-scale=1.0">
                </head>
                <body style="margin:0;padding:0;background-color:#111827;
                             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0"
                         style="background-color:#111827;padding:40px 16px;">
                    <tr><td align="center">
                      <table width="560" cellpadding="0" cellspacing="0"
                             style="max-width:560px;width:100%%;">

                        <!-- Header -->
                        <tr>
                          <td style="background-color:#1F2937;
                                     border-top:4px solid #6366F1;
                                     border-radius:12px 12px 0 0;
                                     padding:32px 32px 24px;">
                            <p style="margin:0 0 4px;font-size:12px;color:#6B7280;
                                      letter-spacing:0.08em;text-transform:uppercase;">
                              Appointment System
                            </p>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#F9FAFB;">
                              Password Reset Request
                            </h1>
                          </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                          <td style="background-color:#1F2937;padding:28px 32px;">
                            <p style="margin:0 0 24px;font-size:15px;color:#D1D5DB;line-height:1.6;">
                              Hi,<br><br>
                              We received a request to reset your password.
                              Use the OTP below to proceed. It is valid for
                              <strong style="color:#F9FAFB;">10 minutes</strong>.
                            </p>

                            <!-- OTP box -->
                            <table width="100%%" cellpadding="0" cellspacing="0"
                                   style="margin-bottom:24px;">
                              <tr>
                                <td align="center">
                                  <div style="display:inline-block;
                                              background-color:#111827;
                                              border:2px solid #6366F1;
                                              border-radius:12px;
                                              padding:20px 48px;">
                                    <p style="margin:0 0 6px;font-size:12px;
                                              color:#6B7280;letter-spacing:0.1em;
                                              text-transform:uppercase;">
                                      Your OTP
                                    </p>
                                    <p style="margin:0;font-size:42px;font-weight:700;
                                              color:#6366F1;letter-spacing:0.25em;
                                              font-family:monospace;">
                                      %s
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>

                            <!-- Warning box -->
                            <table width="100%%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="background-color:#1C1917;
                                           border-left:3px solid #F59E0B;
                                           border-radius:0 6px 6px 0;
                                           padding:12px 16px;">
                                  <p style="margin:0;font-size:13px;
                                            color:#D1D5DB;line-height:1.5;">
                                    If you did not request a password reset,
                                    please ignore this email. Your account is safe.
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td style="background-color:#374151;
                                     border-radius:0 0 12px 12px;
                                     padding:20px 32px;">
                            <p style="margin:0;font-size:13px;
                                      color:#9CA3AF;line-height:1.5;">
                              This OTP expires in 10 minutes and can only be used once.
                              Never share this code with anyone.
                            </p>
                          </td>
                        </tr>

                        <!-- Bottom caption -->
                        <tr>
                          <td style="padding:20px 0;text-align:center;">
                            <p style="margin:0;font-size:12px;color:#4B5563;">
                              This email was sent by the Appointment Booking System.
                              Please do not reply to this email.
                            </p>
                          </td>
                        </tr>

                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(otp);

        sendHtmlEmail(toEmail, subject, html);
    }

    public void sendStatusChangeEmail(Appointment appointment) {
        String to = appointment.getUser().getEmail();
        String userName = appointment.getUser().getName() != null
                ? appointment.getUser().getName()
                : to;
        String businessName = appointment.getBusiness().getName();
        String serviceName  = appointment.getService().getName();
        String date = appointment.getAppointmentDate()
                .format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        String time = appointment.getAppointmentTime().format(TIME_FMT);
        String status = appointment.getStatus().name();

        String emoji, statusColor, subjectLine, bodyNote;

        switch (appointment.getStatus()) {
            case CONFIRMED -> {
                emoji       = "✅";
                statusColor = "#3B82F6";
                subjectLine = "Appointment Confirmed — " + businessName;
                bodyNote    = "Great news! Your appointment has been confirmed. Please be on time.";
            }
            case CANCELLED -> {
                emoji       = "❌";
                statusColor = "#EF4444";
                subjectLine = "Appointment Cancelled — " + businessName;
                bodyNote    = "Unfortunately your appointment has been cancelled by the business. "
                        + "You may book a new slot at your convenience.";
            }
            case COMPLETED -> {
                emoji       = "🏁";
                statusColor = "#8B5CF6";
                subjectLine = "Appointment Completed — " + businessName;
                bodyNote    = "Your appointment is marked as completed. "
                        + "We'd love to hear your feedback — please leave a review!";
            }
            default -> {
                emoji       = "ℹ️";
                statusColor = "#6B7280";
                subjectLine = "Appointment Update — " + businessName;
                bodyNote    = "Your appointment status has been updated.";
            }
        }

        String html = buildEmailHtml(
                emoji + " Appointment " + capitalize(status.toLowerCase()),
                "Hi " + userName + ",",
                bodyNote,
                new String[][]{
                        {"Business", businessName},
                        {"Service",  serviceName},
                        {"Date",     date},
                        {"Time",     time},
                        {"Status",   status}
                },
                "Thank you for using our platform.",
                statusColor
        );

        sendHtmlEmail(to, subjectLine, html);
    }

    public void sendReminderEmail(Appointment appointment) {
        String to = appointment.getUser().getEmail();
        String userName = appointment.getUser().getName() != null
                ? appointment.getUser().getName()
                : to;
        String businessName = appointment.getBusiness().getName();
        String serviceName  = appointment.getService().getName();
        String date = appointment.getAppointmentDate()
                .format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        String time = appointment.getAppointmentTime().format(TIME_FMT);

        String subject = "Reminder: Appointment Tomorrow — " + businessName;
        String html = buildEmailHtml(
                "⏰ Appointment Reminder",
                "Hi " + userName + ",",
                "This is a friendly reminder that you have an appointment tomorrow!",
                new String[][]{
                        {"Business", businessName},
                        {"Service",  serviceName},
                        {"Date",     date},
                        {"Time",     time},
                        {"Status",   appointment.getStatus().name()}
                },
                "Please make sure to be on time. See you soon!",
                "#F59E0B"
        );

        sendHtmlEmail(to, subject, html);
    }

    public void sendCancellationByUserEmail(Appointment appointment) {
        String ownerEmail = appointment.getBusiness().getOwner().getEmail();
        String ownerName  = appointment.getBusiness().getOwner().getName() != null
                ? appointment.getBusiness().getOwner().getName()
                : ownerEmail;

        String customerName  = appointment.getUser().getName() != null
                ? appointment.getUser().getName()
                : appointment.getUser().getEmail();
        String customerEmail = appointment.getUser().getEmail();
        String businessName  = appointment.getBusiness().getName();
        String serviceName   = appointment.getService().getName();
        String date = appointment.getAppointmentDate()
                .format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        String time = appointment.getAppointmentTime().format(TIME_FMT);

        String subject = "Booking Cancelled by Customer — " + businessName;
        String html = buildEmailHtml(
                "❌ Appointment Cancelled",
                "Hi " + ownerName + ",",
                "A customer has cancelled their upcoming appointment at " + businessName + ".",
                new String[][]{
                        {"Customer",       customerName},
                        {"Customer Email", customerEmail},
                        {"Service",        serviceName},
                        {"Date",           date},
                        {"Time",           time},
                        {"Status",         "CANCELLED"}
                },
                "The time slot is now free. No action needed from your side.",
                "#EF4444"
        );

        sendHtmlEmail(ownerEmail, subject, html);
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    private void sendHtmlEmail(String to, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            // Log but don't crash the main flow if email fails
            System.err.println("Failed to send email to " + to + ": " + e.getMessage());
        }
    }

    private String buildEmailHtml(
            String heading, String greeting, String intro, String[][] rows, String footer, String accentColor
    ) {
        StringBuilder rowsHtml = new StringBuilder();
        for (String[] row : rows) {
            rowsHtml.append("""
                    <tr>
                      <td style="padding:10px 16px;font-size:14px;color:#9CA3AF;
                                 border-bottom:1px solid #2D2D2D;width:35%%;white-space:nowrap;">
                        %s
                      </td>
                      <td style="padding:10px 16px;font-size:14px;color:#F3F4F6;
                                 border-bottom:1px solid #2D2D2D;font-weight:600;">
                        %s
                      </td>
                    </tr>
                    """.formatted(row[0], row[1]));
        }

        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
                <body style="margin:0;padding:0;background-color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#111827;padding:40px 16px;">
                    <tr><td align="center">
                      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%%;">

                        <!-- Header -->
                        <tr>
                          <td style="background-color:#1F2937;
                                     border-top:4px solid %s;
                                     border-radius:12px 12px 0 0;
                                     padding:32px 32px 24px;">
                            <p style="margin:0 0 4px;font-size:12px;color:#6B7280;
                                      letter-spacing:0.08em;text-transform:uppercase;">
                              Appointment System
                            </p>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#F9FAFB;">
                              %s
                            </h1>
                          </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                          <td style="background-color:#1F2937;padding:0 32px 28px;">
                            <p style="margin:0 0 20px;font-size:15px;color:#D1D5DB;line-height:1.6;">
                              %s<br><br>%s
                            </p>

                            <!-- Detail table -->
                            <table width="100%%" cellpadding="0" cellspacing="0"
                                   style="border-collapse:collapse;
                                          border:1px solid #2D2D2D;border-radius:8px;overflow:hidden;">
                              %s
                            </table>
                          </td>
                        </tr>

                        <!-- Footer note -->
                        <tr>
                          <td style="background-color:#374151;
                                     border-radius:0 0 12px 12px;
                                     padding:20px 32px;">
                            <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.5;">
                              %s
                            </p>
                          </td>
                        </tr>

                        <!-- Bottom caption -->
                        <tr>
                          <td style="padding:20px 0;text-align:center;">
                            <p style="margin:0;font-size:12px;color:#4B5563;">
                              This email was sent by the Appointment Booking System.
                              Please do not reply to this email.
                            </p>
                          </td>
                        </tr>

                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(accentColor, heading, greeting, intro, rowsHtml, footer);
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    // Add this method to EmailService

    public void sendBusinessDeletionOtpEmail(String toEmail, String ownerName,
                                             String businessName, String otp) {
        String subject = "⚠️ Business Deletion Verification — " + businessName;

        String html = buildEmailHtml(
                "⚠️ Business Deletion Request",
                "Hi " + (ownerName != null ? ownerName : toEmail) + ",",
                "We received a request to permanently delete your business <strong style=\"color:#F9FAFB;\">"
                        + businessName + "</strong>. "
                        + "Use the code below to confirm. If you did not request this, "
                        + "please secure your account immediately.",
                new String[][]{
                        {"Business",    businessName},
                        {"Action",      "Permanent Deletion"},
                        {"OTP",         otp},
                        {"Expires in",  "10 minutes"}
                },
                "⚠️ This action cannot be undone. "
                        + "All services and future appointments will be cancelled. "
                        + "Never share this code with anyone.",
                "#EF4444"   // red accent — signals danger
        );

        sendHtmlEmail(toEmail, subject, html);
    }

    public void sendBusinessClosureAppointmentCancelEmail(Appointment appointment) {
        String to = appointment.getUser().getEmail();
        String userName = appointment.getUser().getName() != null
                ? appointment.getUser().getName()
                : to;
        String businessName = appointment.getBusiness().getName();
        String serviceName  = appointment.getService().getName();
        String date = appointment.getAppointmentDate()
                .format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        String time = appointment.getAppointmentTime().format(TIME_FMT);

        String subject = "⚠️ Appointment Cancelled — " + businessName + " is no longer available";

        String html = buildEmailHtml(
                "⚠️ Appointment Cancelled",
                "Hi " + userName + ",",
                "We're sorry to inform you that <strong style=\"color:#F9FAFB;\">"
                        + businessName + "</strong> has closed on our platform. "
                        + "As a result, your upcoming appointment has been automatically cancelled.",
                new String[][]{
                        {"Business",  businessName},
                        {"Service",   serviceName},
                        {"Date",      date},
                        {"Time",      time},
                        {"Status",    "CANCELLED"}
                },
                "We apologize for the inconvenience. "
                        + "Please browse other available businesses on our platform to rebook.",
                "#F59E0B"
        );

        sendHtmlEmail(to, subject, html);
    }
}
