package org.vaidik.appointment.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.entity.Appointment;

import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    @Async
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

    @Async
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

    @Async
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

    @Async
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

    @Async
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

    @Async
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

    @Async
    public void sendDepositConfirmationEmail(Appointment appointment,
                                             org.vaidik.appointment.entity.Payment payment) {
        String to       = appointment.getUser().getEmail();
        String userName = appointment.getUser().getName() != null
                ? appointment.getUser().getName() : to;
        String date = appointment.getAppointmentDate()
                .format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        String time = appointment.getAppointmentTime().format(TIME_FMT);

        String subject = "Deposit Confirmed — " + appointment.getService().getName();
        String html = buildEmailHtml(
                "💰 Deposit Payment Confirmed",
                "Hi " + userName + ",",
                "Your deposit has been successfully received. Your appointment is now confirmed.",
                new String[][]{
                        {"Business",        appointment.getBusiness().getName()},
                        {"Service",         appointment.getService().getName()},
                        {"Date",            date},
                        {"Time",            time},
                        {"Deposit Paid",    "₹" + payment.getDepositAmount()},
                        {"Pay at Service",  "₹" + (appointment.getService().getPrice()
                                - payment.getDepositAmount().doubleValue())},
                        {"Status",          "CONFIRMED"}
                },
                "The remaining amount is to be paid directly to the service provider at the time of your appointment.",
                "#10B981"
        );
        sendHtmlEmail(to, subject, html);
    }

    @Async
    public void sendRefundNotificationEmail(Appointment appointment,
                                            java.math.BigDecimal refundAmount,
                                            org.vaidik.appointment.entity.PaymentStatus status) {
        String to       = appointment.getUser().getEmail();
        String userName = appointment.getUser().getName() != null
                ? appointment.getUser().getName() : to;
        String date = appointment.getAppointmentDate()
                .format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        String time = appointment.getAppointmentTime().format(TIME_FMT);

        String refundNote = switch (status) {
            case CANCELLED_REFUNDED  ->
                    "Your appointment was cancelled more than 48 hours in advance. A full refund has been initiated.";
            case CANCELLED_PARTIAL   ->
                    "Your appointment was cancelled between 24–48 hours before the scheduled time. A 50% refund has been initiated as per our cancellation policy.";
            case CANCELLED_NO_REFUND ->
                    "Your appointment was cancelled within 24 hours of the scheduled time. As per our cancellation policy, no refund is applicable.";
            default -> "Your refund is being processed.";
        };

        String subject = "Cancellation & Refund Update — " + appointment.getService().getName();
        String html = buildEmailHtml(
                "🔄 Cancellation & Refund",
                "Hi " + userName + ",",
                refundNote,
                new String[][]{
                        {"Business",       appointment.getBusiness().getName()},
                        {"Service",        appointment.getService().getName()},
                        {"Date",           date},
                        {"Time",           time},
                        {"Refund Amount",  "₹" + refundAmount},
                        {"Status",         status.name()}
                },
                "Refunds typically reflect in your account within 5–7 business days depending on your bank.",
                "#F59E0B"
        );
        sendHtmlEmail(to, subject, html);
    }

    @Async
    public void sendCompletionConsentEmail(Appointment appointment,
                                           String otp,
                                           String token) {
        String to       = appointment.getUser().getEmail();
        String userName = appointment.getUser().getName() != null
                ? appointment.getUser().getName() : to;
        String date = appointment.getAppointmentDate()
                .format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        String time = appointment.getAppointmentTime().format(TIME_FMT);

        // Consent link — update domain when going live
        String confirmLink = "http://localhost:5173/consent/" + token;

        String subject = "Please Confirm Your Service — " + appointment.getService().getName();

        // Custom HTML for this one since it needs the OTP box + button
        String otpSection = """
            <!-- OTP Box -->
            <table width="100%%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
              <tr>
                <td align="center">
                  <div style="display:inline-block;
                              background-color:#111827;
                              border:2px solid #6366F1;
                              border-radius:12px;
                              padding:20px 48px;">
                    <p style="margin:0 0 6px;font-size:12px;color:#6B7280;
                              letter-spacing:0.1em;text-transform:uppercase;">
                      Your OTP (valid 30 minutes)
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
            <p style="text-align:center;font-size:14px;color:#9CA3AF;margin:0 0 16px;">
              Share this OTP with your service provider
              <strong style="color:#F9FAFB;">OR</strong>
              click the button below to confirm directly
            </p>
            <!-- Confirm Button -->
            <table width="100%%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
              <tr>
                <td align="center">
                  <a href="%s"
                     style="display:inline-block;
                            background:linear-gradient(135deg,#10B981,#059669);
                            color:#ffffff;
                            padding:14px 36px;
                            border-radius:8px;
                            text-decoration:none;
                            font-weight:700;
                            font-size:15px;">
                    ✅ Confirm Service Received
                  </a>
                </td>
              </tr>
            </table>
            <p style="text-align:center;font-size:13px;color:#9CA3AF;">
              Did not receive this service?
              <a href="%s" style="color:#EF4444;text-decoration:underline;">
                Raise a dispute here
              </a>
            </p>
            """.formatted(otp, confirmLink, confirmLink);

        String html = """
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background-color:#111827;
                         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0"
                     style="background-color:#111827;padding:40px 16px;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0"
                         style="max-width:560px;width:100%%;">
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
                          🔐 Service Completion Confirmation
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color:#1F2937;padding:28px 32px;">
                        <p style="margin:0 0 16px;font-size:15px;color:#D1D5DB;line-height:1.6;">
                          Hi <strong style="color:#F9FAFB;">%s</strong>,<br><br>
                          Your service provider has marked your appointment at
                          <strong style="color:#F9FAFB;">%s</strong>
                          as completed. Please confirm below.
                        </p>
                        <!-- Detail table -->
                        <table width="100%%" cellpadding="0" cellspacing="0"
                               style="border-collapse:collapse;border:1px solid #2D2D2D;
                                      border-radius:8px;overflow:hidden;margin-bottom:20px;">
                          <tr>
                            <td style="padding:10px 16px;font-size:14px;color:#9CA3AF;
                                       border-bottom:1px solid #2D2D2D;width:35%%;">Service</td>
                            <td style="padding:10px 16px;font-size:14px;color:#F3F4F6;
                                       border-bottom:1px solid #2D2D2D;font-weight:600;">
                              %s
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 16px;font-size:14px;color:#9CA3AF;
                                       border-bottom:1px solid #2D2D2D;">Date</td>
                            <td style="padding:10px 16px;font-size:14px;color:#F3F4F6;
                                       border-bottom:1px solid #2D2D2D;font-weight:600;">
                              %s
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 16px;font-size:14px;color:#9CA3AF;">Time</td>
                            <td style="padding:10px 16px;font-size:14px;color:#F3F4F6;font-weight:600;">
                              %s
                            </td>
                          </tr>
                        </table>
                        %s
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color:#374151;border-radius:0 0 12px 12px;
                                 padding:20px 32px;">
                        <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.5;">
                          This link expires in 30 minutes. Never share your OTP with anyone
                          other than the service provider present at the location.
                        </p>
                      </td>
                    </tr>
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
            """.formatted(userName, appointment.getBusiness().getName(),
                appointment.getService().getName(), date, time, otpSection);

        sendHtmlEmail(to, subject, html);
    }

    @Async
    public void sendServiceCompletedEmail(Appointment appointment) {
        String to       = appointment.getUser().getEmail();
        String userName = appointment.getUser().getName() != null
                ? appointment.getUser().getName() : to;
        String date = appointment.getAppointmentDate()
                .format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        String time = appointment.getAppointmentTime().format(TIME_FMT);

        String subject = "Service Completed — " + appointment.getService().getName();
        String html = buildEmailHtml(
                "🏁 Service Completed",
                "Hi " + userName + ",",
                "Your service has been completed and confirmed. Thank you for using BookEase!",
                new String[][]{
                        {"Business", appointment.getBusiness().getName()},
                        {"Service",  appointment.getService().getName()},
                        {"Date",     date},
                        {"Time",     time},
                        {"Status",   "COMPLETED"}
                },
                "We'd love to hear about your experience. Head to your appointments page to leave a review.",
                "#8B5CF6"
        );
        sendHtmlEmail(to, subject, html);
    }

    @Async
    public void sendServiceConfirmedEmail(Appointment appointment) {
        String to       = appointment.getUser().getEmail();
        String userName = appointment.getUser().getName() != null
                ? appointment.getUser().getName() : to;
        String date = appointment.getAppointmentDate()
                .format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        String time = appointment.getAppointmentTime().format(TIME_FMT);

        // Calculate remaining amount
        double totalPrice     = appointment.getService().getPrice();
        double depositPaid    = appointment.getDepositAmount() != null
                ? appointment.getDepositAmount().doubleValue()
                : totalPrice * 0.30;
        double remainingAmount = totalPrice - depositPaid;

        String subject = "Service Confirmed — Please Pay Remaining Amount";
        String html = buildEmailHtml(
                "✅ Service Confirmed",
                "Hi " + userName + ",",
                "Your service has been confirmed. Please pay the remaining amount directly to the service provider.",
                new String[][]{
                        {"Business",          appointment.getBusiness().getName()},
                        {"Service",           appointment.getService().getName()},
                        {"Date",              date},
                        {"Time",              time},
                        {"Deposit Paid",      "₹" + String.format("%.2f", depositPaid)},
                        {"Remaining to Pay",  "₹" + String.format("%.2f", remainingAmount)},
                        {"Payment Method",    "Cash / UPI directly to service provider"}
                },
                "Please pay ₹" + String.format("%.2f", remainingAmount) +
                        " directly to the service provider via cash or UPI to complete your booking.",
                "#6366F1"
        );
        sendHtmlEmail(to, subject, html);
    }
}
