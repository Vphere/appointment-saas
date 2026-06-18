package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.CancelledAppointmentInfo;
import org.vaidik.appointment.entity.Appointment;
import org.vaidik.appointment.entity.EmailOutbox;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final EmailDeliveryService emailDeliveryService;
    private final Optional<EmailQueuePublisher> emailQueuePublisher;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    // ─────────────────────────────────────────────────────────────────────────
    //  OTP — Password Reset
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendOtpEmail(String toEmail, String otp) {
        String subject = "Your Password Reset OTP — BookEase";
        String html = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width,initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;background-color:#0d0f19;
                         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0"
                     style="background-color:#0d0f19;padding:40px 16px;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0"
                         style="max-width:560px;width:100%%;">

                    %s

                    <!-- Body -->
                    <tr>
                      <td style="background-color:#1a1d2e;padding:28px 32px;">
                        <p style="margin:0 0 24px;font-size:15px;color:#cbd5e1;line-height:1.6;">
                          Hi,<br><br>
                          We received a request to reset your BookEase password.
                          Use the OTP below to proceed. It is valid for
                          <strong style="color:#f1f5f9;">10 minutes</strong>.
                        </p>

                        <!-- OTP box -->
                        <table width="100%%" cellpadding="0" cellspacing="0"
                               style="margin-bottom:24px;">
                          <tr>
                            <td align="center">
                              <div style="display:inline-block;
                                          background-color:#0d0f19;
                                          border:2px solid #6366f1;
                                          border-radius:12px;
                                          padding:20px 48px;">
                                <p style="margin:0 0 6px;font-size:12px;
                                          color:#64748b;letter-spacing:0.1em;
                                          text-transform:uppercase;">
                                  Your OTP
                                </p>
                                <p style="margin:0;font-size:42px;font-weight:700;
                                          color:#6366f1;letter-spacing:0.25em;
                                          font-family:monospace;">
                                  %s
                                </p>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Warning -->
                        <table width="100%%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="background-color:#1c1917;
                                       border-left:3px solid #f59e0b;
                                       border-radius:0 6px 6px 0;
                                       padding:12px 16px;">
                              <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.5;">
                                🔐 If you did not request a password reset,
                                please ignore this email. Your account is safe.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    %s
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(buildHeader("Password Reset Request", "#6366f1"), otp, buildFooter("This OTP expires in 10 minutes and can only be used once. Never share this code with anyone."));

        sendHtmlEmail(toEmail, subject, html, "OTP_PASSWORD_RESET");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Booking Created — sent to customer when appointment is first made
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendBookingCreatedEmail(Appointment appointment) {
        String to       = appointment.getUser().getEmail();
        String userName = userName(appointment.getUser());
        String date     = appointment.getAppointmentDate().format(DATE_FMT);
        String time     = appointment.getAppointmentTime().format(TIME_FMT);
        boolean isConsultation = "CONSULTATION".equalsIgnoreCase(
                appointment.getService().getServiceType() != null
                        ? appointment.getService().getServiceType().name() : "FIXED");
        String durationDisplay = isConsultation
                ? "Consultation (flexible)"
                : (appointment.getService().getDuration() != null
                ? appointment.getService().getDuration() + " min"
                : "—");

        String subject = "Booking Received — " + appointment.getService().getName() + " at " + appointment.getBusiness().getName();
        String html = buildEmailHtml(
                "📋 Booking Received",
                "Hi " + userName + ",",
                "Your booking request has been received! Please complete your <strong style=\"color:#f1f5f9;\">30% deposit payment</strong> to reserve your slot. Your appointment will be confirmed by the business owner after payment.",
                new String[][]{
                        {"Business",      appointment.getBusiness().getName()},
                        {"Service",       appointment.getService().getName()},
                        {"Type",          isConsultation ? "Consultation" : "Fixed Duration"},
                        {"Date",          date},
                        {"Time",          time},
                        {"Duration",      durationDisplay},
                        {"Total Price",   "₹" + appointment.getService().getPrice()},
                        {"Deposit (30%)", "₹" + Math.round(appointment.getService().getPrice() * 0.30)},
                        {"Pay at Service","₹" + Math.round(appointment.getService().getPrice() * 0.70)},
                        {"Status",        "PENDING PAYMENT"}
                },
                "⏳ Please complete your deposit payment from your appointments page to confirm this slot.",
                "#6366f1"
        );
        sendHtmlEmail(to, subject, html, "BOOKING_CREATED");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Deposit Confirmed
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendDepositConfirmationEmail(Appointment appointment,
                                             org.vaidik.appointment.entity.Payment payment) {
        String to       = appointment.getUser().getEmail();
        String userName = userName(appointment.getUser());
        String date     = appointment.getAppointmentDate().format(DATE_FMT);
        String time     = appointment.getAppointmentTime().format(TIME_FMT);
        double remaining = appointment.getService().getPrice() - payment.getDepositAmount().doubleValue();

        String subject = "💰 Deposit Confirmed — " + appointment.getService().getName();
        String html = buildEmailHtml(
                "💰 Deposit Payment Confirmed",
                "Hi " + userName + ",",
                "Your deposit has been successfully received! Your appointment slot is now reserved and is awaiting confirmation from the business owner. You will receive another email once confirmed.",
                new String[][]{
                        {"Business",       appointment.getBusiness().getName()},
                        {"Service",        appointment.getService().getName()},
                        {"Date",           date},
                        {"Time",           time},
                        {"Deposit Paid",   "₹" + payment.getDepositAmount()},
                        {"Pay at Service", "₹" + Math.round(remaining)},
                        {"Status",         "PENDING OWNER CONFIRMATION"}
                },
                "The remaining amount (₹" + Math.round(remaining) + ") is to be paid directly to the service provider on the day of your appointment.",
                "#10b981"
        );
        sendHtmlEmail(to, subject, html, "DEPOSIT_CONFIRMATION");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Appointment Confirmed by owner (replaces generic status-change for CONFIRMED)
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendServiceConfirmedEmail(Appointment appointment) {
        String to       = appointment.getUser().getEmail();
        String userName = userName(appointment.getUser());
        String date     = appointment.getAppointmentDate().format(DATE_FMT);
        String time     = appointment.getAppointmentTime().format(TIME_FMT);
        double totalPrice     = appointment.getService().getPrice();
        double depositPaid    = appointment.getDepositAmount() != null
                ? appointment.getDepositAmount().doubleValue()
                : totalPrice * 0.30;
        double remainingAmount = totalPrice - depositPaid;

        String subject = "✅ Appointment Confirmed — " + appointment.getBusiness().getName();
        String html = buildEmailHtml(
                "✅ Appointment Confirmed",
                "Hi " + userName + ",",
                "Great news! Your appointment has been <strong style=\"color:#10b981;\">confirmed</strong> by the business owner. Please be on time and carry the remaining payment.",
                new String[][]{
                        {"Business",         appointment.getBusiness().getName()},
                        {"Service",          appointment.getService().getName()},
                        {"Date",             date},
                        {"Time",             time},
                        {"Duration",         appointment.getService().getDuration() + " min"},
                        {"Deposit Paid",     "₹" + String.format("%.0f", depositPaid)},
                        {"Remaining to Pay", "₹" + String.format("%.0f", remainingAmount)},
                        {"Payment Method",   "Cash / UPI directly to service provider"},
                        {"Status",           "CONFIRMED ✅"}
                },
                "💡 Please pay ₹" + String.format("%.0f", remainingAmount)
                        + " directly to the service provider via cash or UPI at the time of your appointment.",
                "#6366f1"
        );
        sendHtmlEmail(to, subject, html, "SERVICE_CONFIRMED");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Status Change — used only for CANCELLED (by owner) now
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendStatusChangeEmail(Appointment appointment) {
        // Only send for CANCELLED status — CONFIRMED is handled by sendServiceConfirmedEmail
        if (appointment.getStatus() != org.vaidik.appointment.entity.AppointmentStatus.CANCELLED) {
            return;
        }
        String to           = appointment.getUser().getEmail();
        String userName     = userName(appointment.getUser());
        String businessName = appointment.getBusiness().getName();
        String serviceName  = appointment.getService().getName();
        String date         = appointment.getAppointmentDate().format(DATE_FMT);
        String time         = appointment.getAppointmentTime().format(TIME_FMT);

        String subject = "❌ Appointment Cancelled — " + businessName;
        String html = buildEmailHtml(
                "❌ Appointment Cancelled",
                "Hi " + userName + ",",
                "Unfortunately your appointment at <strong style=\"color:#f1f5f9;\">" + businessName
                        + "</strong> has been cancelled by the business. If you paid a deposit, a refund will be initiated automatically.",
                new String[][]{
                        {"Business", businessName},
                        {"Service",  serviceName},
                        {"Date",     date},
                        {"Time",     time},
                        {"Status",   "CANCELLED ❌"}
                },
                "We're sorry for the inconvenience. You may browse other available services and rebook at your convenience.",
                "#ef4444"
        );
        sendHtmlEmail(to, subject, html, "STATUS_CHANGE_CANCELLED");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Appointment Reminder
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendReminderEmail(Appointment appointment) {
        String to           = appointment.getUser().getEmail();
        String userName     = userName(appointment.getUser());
        String businessName = appointment.getBusiness().getName();
        String serviceName  = appointment.getService().getName();
        String date         = appointment.getAppointmentDate().format(DATE_FMT);
        String time         = appointment.getAppointmentTime().format(TIME_FMT);
        double totalPrice     = appointment.getService().getPrice();
        double depositPaid    = appointment.getDepositAmount() != null
                ? appointment.getDepositAmount().doubleValue() : totalPrice * 0.30;
        double remaining = totalPrice - depositPaid;

        String subject = "⏰ Reminder: Appointment Tomorrow — " + businessName;
        String html = buildEmailHtml(
                "⏰ Appointment Reminder",
                "Hi " + userName + ",",
                "This is a friendly reminder that you have an appointment <strong style=\"color:#f1f5f9;\">tomorrow</strong>! Please make sure to be on time and carry the remaining payment.",
                new String[][]{
                        {"Business",         businessName},
                        {"Service",          serviceName},
                        {"Date",             date},
                        {"Time",             time},
                        {"Duration",         appointment.getService().getDuration() + " min"},
                        {"Remaining to Pay", "₹" + String.format("%.0f", remaining)},
                        {"Status",           appointment.getStatus().name()}
                },
                "💡 Remember to bring ₹" + String.format("%.0f", remaining) + " for the remaining payment. See you soon!",
                "#f59e0b"
        );
        sendHtmlEmail(to, subject, html, "REMINDER");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Cancellation by Customer → notify owner
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendCancellationByUserEmail(Appointment appointment) {
        String ownerEmail    = appointment.getBusiness().getOwner().getEmail();
        String ownerName     = userName(appointment.getBusiness().getOwner());
        String customerName  = userName(appointment.getUser());
        String customerEmail = appointment.getUser().getEmail();
        String businessName  = appointment.getBusiness().getName();
        String serviceName   = appointment.getService().getName();
        String date          = appointment.getAppointmentDate().format(DATE_FMT);
        String time          = appointment.getAppointmentTime().format(TIME_FMT);

        String subject = "❌ Booking Cancelled by Customer — " + businessName;
        String html = buildEmailHtml(
                "❌ Appointment Cancelled by Customer",
                "Hi " + ownerName + ",",
                "A customer has cancelled their upcoming appointment at <strong style=\"color:#f1f5f9;\">" + businessName + "</strong>. The time slot is now free.",
                new String[][]{
                        {"Customer",       customerName},
                        {"Customer Email", customerEmail},
                        {"Service",        serviceName},
                        {"Date",           date},
                        {"Time",           time},
                        {"Status",         "CANCELLED ❌"}
                },
                "No action is needed from your side. The time slot has been automatically freed for new bookings.",
                "#ef4444"
        );
        sendHtmlEmail(ownerEmail, subject, html, "CANCELLATION_NOTICE");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Refund Notification
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendRefundNotificationEmail(Appointment appointment,
                                            java.math.BigDecimal refundAmount,
                                            org.vaidik.appointment.entity.PaymentStatus status) {
        String to       = appointment.getUser().getEmail();
        String userName = userName(appointment.getUser());
        String date     = appointment.getAppointmentDate().format(DATE_FMT);
        String time     = appointment.getAppointmentTime().format(TIME_FMT);

        String refundNote = switch (status) {
            case CANCELLED_REFUNDED ->
                    "Your appointment was cancelled more than 48 hours in advance. A <strong style=\"color:#10b981;\">full refund of ₹" + refundAmount + "</strong> has been initiated.";
            case CANCELLED_PARTIAL ->
                    "Your appointment was cancelled between 24–48 hours before the scheduled time. A <strong style=\"color:#f59e0b;\">50% refund of ₹" + refundAmount + "</strong> has been initiated as per our cancellation policy.";
            case CANCELLED_NO_REFUND ->
                    "Your appointment was cancelled within 24 hours of the scheduled time. As per our cancellation policy, <strong style=\"color:#ef4444;\">no refund is applicable</strong>.";
            default -> "Your refund is being processed.";
        };

        String subject = "🔄 Cancellation & Refund Update — " + appointment.getService().getName();
        String html = buildEmailHtml(
                "🔄 Cancellation & Refund",
                "Hi " + userName + ",",
                refundNote,
                new String[][]{
                        {"Business",      appointment.getBusiness().getName()},
                        {"Service",       appointment.getService().getName()},
                        {"Date",          date},
                        {"Time",          time},
                        {"Refund Amount", "₹" + refundAmount},
                        {"Status",        status.name().replace("_", " ")}
                },
                "Refunds typically reflect in your account within 5–7 business days depending on your bank and payment method.",
                "#f59e0b"
        );
        sendHtmlEmail(to, subject, html, "REFUND_NOTIFICATION");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Service Completion Consent (OTP + Link)
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendCompletionConsentEmail(Appointment appointment,
                                           String otp,
                                           String token) {
        String to       = appointment.getUser().getEmail();
        String userName = userName(appointment.getUser());
        String date     = appointment.getAppointmentDate().format(DATE_FMT);
        String time     = appointment.getAppointmentTime().format(TIME_FMT);

        // Use configured frontend URL — NOT hardcoded localhost
        String confirmLink = frontendUrl + "/consent/" + token;

        String subject = "🔐 Please Confirm Your Service — " + appointment.getService().getName();

        String html = """
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background-color:#0d0f19;
                         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0"
                     style="background-color:#0d0f19;padding:40px 16px;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0"
                         style="max-width:560px;width:100%%;">

                    %s

                    <tr>
                      <td style="background-color:#1a1d2e;padding:28px 32px;">
                        <p style="margin:0 0 16px;font-size:15px;color:#cbd5e1;line-height:1.6;">
                          Hi <strong style="color:#f1f5f9;">%s</strong>,<br><br>
                          Your service provider at
                          <strong style="color:#f1f5f9;">%s</strong>
                          has marked your appointment as completed.
                          Please confirm by using the OTP <strong style="color:#f1f5f9;">OR</strong>
                          clicking the button below.
                        </p>

                        <!-- Detail table -->
                        <table width="100%%" cellpadding="0" cellspacing="0"
                               style="border-collapse:collapse;border:1px solid #2d3748;
                                      border-radius:8px;overflow:hidden;margin-bottom:24px;">
                          <tr>
                            <td style="padding:10px 16px;font-size:14px;color:#64748b;
                                       border-bottom:1px solid #2d3748;width:35%%;">Service</td>
                            <td style="padding:10px 16px;font-size:14px;color:#f1f5f9;
                                       border-bottom:1px solid #2d3748;font-weight:600;">%s</td>
                          </tr>
                          <tr>
                            <td style="padding:10px 16px;font-size:14px;color:#64748b;
                                       border-bottom:1px solid #2d3748;">Date</td>
                            <td style="padding:10px 16px;font-size:14px;color:#f1f5f9;
                                       border-bottom:1px solid #2d3748;font-weight:600;">%s</td>
                          </tr>
                          <tr>
                            <td style="padding:10px 16px;font-size:14px;color:#64748b;">Time</td>
                            <td style="padding:10px 16px;font-size:14px;color:#f1f5f9;font-weight:600;">%s</td>
                          </tr>
                        </table>

                        <!-- OTP Box -->
                        <table width="100%%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                          <tr>
                            <td align="center">
                              <div style="display:inline-block;
                                          background-color:#0d0f19;
                                          border:2px solid #6366f1;
                                          border-radius:12px;
                                          padding:20px 48px;">
                                <p style="margin:0 0 6px;font-size:11px;color:#64748b;
                                          letter-spacing:0.1em;text-transform:uppercase;">
                                  Share this OTP with your provider (valid 30 min)
                                </p>
                                <p style="margin:0;font-size:42px;font-weight:700;
                                          color:#6366f1;letter-spacing:0.25em;
                                          font-family:monospace;">
                                  %s
                                </p>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <p style="text-align:center;font-size:14px;color:#94a3b8;margin:0 0 16px;">
                          — or confirm directly with one click —
                        </p>

                        <!-- Confirm Button -->
                        <table width="100%%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
                          <tr>
                            <td align="center">
                              <a href="%s"
                                 style="display:inline-block;
                                        background:linear-gradient(135deg,#10b981,#059669);
                                        color:#ffffff;
                                        padding:14px 40px;
                                        border-radius:8px;
                                        text-decoration:none;
                                        font-weight:700;
                                        font-size:15px;
                                        letter-spacing:0.02em;">
                                ✅ Yes, I Received the Service
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="text-align:center;font-size:13px;color:#94a3b8;margin:0;">
                          Didn't receive the service?
                          <a href="%s" style="color:#f87171;text-decoration:underline;">
                            Raise a dispute
                          </a>
                        </p>
                      </td>
                    </tr>

                    %s
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(
                buildHeader("🔐 Service Completion Confirmation", "#6366f1"),
                userName,
                appointment.getBusiness().getName(),
                appointment.getService().getName(),
                date, time,
                otp,
                confirmLink, confirmLink,
                buildFooter("This link and OTP expire in 30 minutes. Never share your OTP with anyone other than the service provider present at the location.")
        );

        sendHtmlEmail(to, subject, html, "OTP_COMPLETION_CONSENT");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Service Completed (after customer confirms via OTP/link + remaining paid)
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendServiceCompletedEmail(Appointment appointment) {
        String to       = appointment.getUser().getEmail();
        String userName = userName(appointment.getUser());
        String date     = appointment.getAppointmentDate().format(DATE_FMT);
        String time     = appointment.getAppointmentTime().format(TIME_FMT);

        String subject = "🏁 Service Completed — " + appointment.getBusiness().getName();
        String html = buildEmailHtml(
                "🏁 Service Completed",
                "Hi " + userName + ",",
                "Your appointment has been fully completed. Thank you for choosing <strong style=\"color:#f1f5f9;\">" + appointment.getBusiness().getName() + "</strong>!",
                new String[][]{
                        {"Business", appointment.getBusiness().getName()},
                        {"Service",  appointment.getService().getName()},
                        {"Date",     date},
                        {"Time",     time},
                        {"Status",   "COMPLETED ✅"}
                },
                "⭐ We'd love to hear about your experience! Head to your appointments page to leave a review.",
                "#8b5cf6"
        );
        sendHtmlEmail(to, subject, html, "SERVICE_COMPLETED");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Business Deletion OTP
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendBusinessDeletionOtpEmail(String toEmail, String ownerName,
                                             String businessName, String otp) {
        String subject = "⚠️ Business Deletion Verification — " + businessName;
        String html = buildEmailHtml(
                "⚠️ Business Deletion Request",
                "Hi " + (ownerName != null ? ownerName : toEmail) + ",",
                "We received a request to <strong style=\"color:#ef4444;\">permanently delete</strong> your business <strong style=\"color:#f1f5f9;\">"
                        + businessName + "</strong>. Use the OTP below to confirm. If you did not request this, please secure your account immediately.",
                new String[][]{
                        {"Business",   businessName},
                        {"Action",     "Permanent Deletion"},
                        {"OTP",        otp},
                        {"Expires in", "10 minutes"}
                },
                "⚠️ This action CANNOT be undone. All services and future appointments will be cancelled. Never share this code with anyone.",
                "#ef4444"
        );
        sendHtmlEmail(toEmail, subject, html, "OTP_BUSINESS_DELETION");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Business Closure — customer notification
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendBusinessClosureAppointmentCancelEmail(Appointment appointment) {
        String to       = appointment.getUser().getEmail();
        String userName = userName(appointment.getUser());
        String date     = appointment.getAppointmentDate().format(DATE_FMT);
        String time     = appointment.getAppointmentTime().format(TIME_FMT);

        String subject = "⚠️ Appointment Cancelled — Business No Longer Available";
        String html = buildEmailHtml(
                "⚠️ Appointment Cancelled",
                "Hi " + userName + ",",
                "We're sorry to inform you that <strong style=\"color:#f1f5f9;\">"
                        + appointment.getBusiness().getName() + "</strong> has closed on our platform. "
                        + "As a result, your upcoming appointment has been automatically cancelled and any deposit paid will be fully refunded.",
                new String[][]{
                        {"Business", appointment.getBusiness().getName()},
                        {"Service",  appointment.getService().getName()},
                        {"Date",     date},
                        {"Time",     time},
                        {"Status",   "CANCELLED ❌"}
                },
                "We apologize for the inconvenience. Please browse other available businesses on BookEase to rebook.",
                "#f59e0b"
        );
        sendHtmlEmail(to, subject, html, "BUSINESS_CLOSURE_CANCEL");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Account Moderation
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendAccountDeletionEmail(String toEmail, String userName, String reason,
                                         List<CancelledAppointmentInfo> cancelledAppointments) {
        String subject = "BookEase — Account Deactivated";

        StringBuilder body = new StringBuilder();
        body.append("""
                <p style="margin:0 0 20px;font-size:15px;color:#cbd5e1;line-height:1.6;">
                  Hi %s,<br><br>
                  An administrator has deactivated your BookEase account.
                  You will no longer be able to log in.
                </p>
                <table width="100%%" cellpadding="0" cellspacing="0"
                       style="border-collapse:collapse;border:1px solid #2d3748;
                              border-radius:8px;overflow:hidden;margin:0 0 20px;">
                  <tr>
                    <td style="padding:10px 16px;font-size:14px;color:#64748b;
                               border-bottom:1px solid #2d3748;width:35%%;">Reason</td>
                    <td style="padding:10px 16px;font-size:14px;color:#f1f5f9;
                               border-bottom:1px solid #2d3748;font-weight:600;">%s</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;font-size:14px;color:#64748b;">Status</td>
                    <td style="padding:10px 16px;font-size:14px;color:#f1f5f9;font-weight:600;">Account Deactivated</td>
                  </tr>
                </table>
                """.formatted(userName, reason));

        if (cancelledAppointments != null && !cancelledAppointments.isEmpty()) {
            body.append("""
                    <p style="margin:0 0 12px;font-size:14px;color:#cbd5e1;line-height:1.6;">
                      The following upcoming appointment(s) have been automatically
                      <strong style="color:#f1f5f9;">cancelled</strong>:
                    </p>
                    """);
            body.append(buildAppointmentsTableHtml(cancelledAppointments));
        }

        String html = wrapEmailShell(
                "🚫 Account Deactivated",
                "#ef4444",
                body.toString(),
                "If you believe this was a mistake, please contact our support team at devsquad45@gmail.com and your account may be restored."
        );
        sendHtmlEmail(toEmail, subject, html, "ACCOUNT_DEACTIVATED");
    }

    @Async
    public void sendAccountRestoredEmail(String toEmail, String userName) {
        String subject = "✅ Your BookEase Account Has Been Restored";
        String html = buildEmailHtml(
                "✅ Account Restored",
                "Hi " + userName + ",",
                "Good news! Your BookEase account has been reviewed and <strong style=\"color:#10b981;\">restored</strong> by an administrator. You can now log in again with your existing credentials.",
                new String[][]{
                        {"Status", "Account Restored ✅"},
                        {"Access", "Full account access reinstated"}
                },
                "Welcome back! All your previous booking history is intact. We're glad to have you back.",
                "#10b981"
        );
        sendHtmlEmail(toEmail, subject, html, "ACCOUNT_RESTORED");
    }

    @Async
    public void sendAppointmentsCancelledForDeletedUserEmail(String ownerEmail, String ownerName,
                                                             String customerName,
                                                             List<CancelledAppointmentInfo> cancelledAppointments) {
        String subject = "❌ Appointments Cancelled — Customer Account Closed";
        String body = """
                <p style="margin:0 0 20px;font-size:15px;color:#cbd5e1;line-height:1.6;">
                  Hi %s,<br><br>
                  The customer <strong style="color:#f1f5f9;">%s</strong>'s account has been
                  closed by an administrator. As a result, the following upcoming appointment(s)
                  at your business have been automatically cancelled:
                </p>
                %s
                """.formatted(ownerName, customerName, buildAppointmentsTableHtml(cancelledAppointments));

        String html = wrapEmailShell(
                "❌ Appointments Cancelled",
                "#ef4444",
                body,
                "These time slots are now free and available for new bookings. No action is needed from your side."
        );
        sendHtmlEmail(ownerEmail, subject, html, "ACCOUNT_DELETION_APPOINTMENTS_CANCELLED");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Slot Expired
    // ─────────────────────────────────────────────────────────────────────────

    public void sendSlotExpiredEmail(Appointment appointment) {
        String to       = appointment.getUser().getEmail();
        String userName = userName(appointment.getUser());
        String date     = appointment.getAppointmentDate().format(DATE_FMT);
        String time     = appointment.getAppointmentTime().format(TIME_FMT);

        String subject = "⏰ Slot Reservation Expired — " + appointment.getService().getName();
        String html = buildEmailHtml(
                "⏰ Slot Reservation Expired",
                "Hi " + userName + ",",
                "Your reserved slot was automatically released because the 30% deposit was not completed within <strong style=\"color:#f1f5f9;\">20 minutes</strong> of booking.",
                new String[][]{
                        {"Business", appointment.getBusiness().getName()},
                        {"Service",  appointment.getService().getName()},
                        {"Date",     date},
                        {"Time",     time},
                        {"Status",   "CANCELLED — No charge"}
                },
                "If you still want this appointment, please visit BookEase and book again — the slot may still be available. No payment was taken.",
                "#f59e0b"
        );
        sendHtmlEmail(to, subject, html, "SLOT_EXPIRED");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Deposit Nudge — sent ~10 min before slot expires if deposit not yet paid
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    public void sendDepositNudgeEmail(Appointment appointment, int minutesLeft) {
        String to       = appointment.getUser().getEmail();
        String userName = userName(appointment.getUser());
        String date     = appointment.getAppointmentDate().format(DATE_FMT);
        String time     = appointment.getAppointmentTime().format(TIME_FMT);
        double depositAmount = appointment.getService().getPrice() * 0.30;

        // This is also the first email the user receives for this booking —
        // we deliberately hold it until 10 min in so that users who pay quickly
        // never see a "pending payment" email at all.
        String subject = "⏳ Action needed: pay deposit to keep your slot — " + appointment.getService().getName();
        String html = buildEmailHtml(
                "⏳ Complete Your Deposit to Secure This Slot",
                "Hi " + userName + ",",
                "You booked a slot at <strong style=\"color:#f1f5f9;\">" + appointment.getBusiness().getName()
                        + "</strong>, but the 30% deposit hasn\'t been paid yet. "
                        + "Your slot will be <strong style=\"color:#ef4444;\">automatically released in approximately "
                        + minutesLeft + " minute" + (minutesLeft == 1 ? "" : "s") + "</strong>.",
                new String[][]{
                        {"Business",        appointment.getBusiness().getName()},
                        {"Service",         appointment.getService().getName()},
                        {"Date",            date},
                        {"Time",            time},
                        {"Total Price",     "₹" + String.format("%.0f", appointment.getService().getPrice())},
                        {"Deposit Due Now", "₹" + String.format("%.0f", depositAmount)},
                        {"Pay at Service",  "₹" + String.format("%.0f", appointment.getService().getPrice() - depositAmount)},
                        {"Status",          "⚠️ DEPOSIT PENDING"}
                },
                "Go to your appointments page and complete the ₹"
                        + String.format("%.0f", depositAmount)
                        + " deposit now to confirm your slot. "
                        + "If not paid in time, the slot will be released with no charge.",
                "#f59e0b"
        );
        sendHtmlEmail(to, subject, html, "DEPOSIT_NUDGE");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private void sendHtmlEmail(String to, String subject, String html) {
        sendHtmlEmail(to, subject, html, "GENERAL");
    }

    private void sendHtmlEmail(String to, String subject, String html, String emailType) {
        EmailOutbox job = emailDeliveryService.enqueue(to, subject, html, emailType);
        boolean sent = emailDeliveryService.attemptSend(job);
        if (!sent) {
            emailQueuePublisher.ifPresent(publisher -> publisher.publish(job.getId()));
        }
    }

    /** Reusable branded header block */
    private String buildHeader(String title, String accentColor) {
        return """
            <tr>
              <td style="background:linear-gradient(135deg,#1a1d2e,#0d0f19);
                         border-top:4px solid %s;
                         border-radius:12px 12px 0 0;
                         padding:28px 32px 20px;">
                <table width="100%%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="vertical-align:middle;padding-right:12px;">
                            <!-- BookEase Logo Mark — always brand purple/indigo, never themed -->
                            <div style="width:36px;height:36px;border-radius:8px;
                                        background:linear-gradient(135deg,#6366f1,#8b5cf6);
                                        display:inline-block;
                                        font-size:20px;line-height:36px;text-align:center;">
                              📅
                            </div>
                          </td>
                          <td style="vertical-align:middle;">
                            <p style="margin:0;font-size:18px;font-weight:800;color:#f1f5f9;
                                      letter-spacing:-0.01em;">
                              Book<span style="color:#a5b4fc;">Ease</span>
                            </p>
                            <p style="margin:0;font-size:11px;color:#64748b;
                                      letter-spacing:0.06em;text-transform:uppercase;">
                              Appointment Platform
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <h1 style="margin:16px 0 0;font-size:22px;font-weight:700;color:#f1f5f9;">
                  %s
                </h1>
              </td>
            </tr>
            """.formatted(accentColor, title);
    }

    /** Reusable branded footer block */
    private String buildFooter(String footerText) {
        return """
            <tr>
              <td style="background-color:#1e2235;
                         border-top:1px solid #2d3748;
                         border-radius:0 0 12px 12px;
                         padding:20px 32px;">
                <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">
                  %s
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 0;text-align:center;">
                <p style="margin:0;font-size:12px;color:#334155;">
                  © 2026 BookEase · This is an automated email, please do not reply.
                </p>
              </td>
            </tr>
            """.formatted(footerText);
    }

    private String buildEmailHtml(
            String heading, String greeting, String intro, String[][] rows, String footer, String accentColor
    ) {
        StringBuilder rowsHtml = new StringBuilder();
        for (String[] row : rows) {
            rowsHtml.append("""
                    <tr>
                      <td style="padding:10px 16px;font-size:14px;color:#64748b;
                                 border-bottom:1px solid #2d3748;width:35%%;white-space:nowrap;">
                        %s
                      </td>
                      <td style="padding:10px 16px;font-size:14px;color:#f1f5f9;
                                 border-bottom:1px solid #2d3748;font-weight:600;">
                        %s
                      </td>
                    </tr>
                    """.formatted(row[0], row[1]));
        }

        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
                <body style="margin:0;padding:0;background-color:#0d0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#0d0f19;padding:40px 16px;">
                    <tr><td align="center">
                      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%%;">

                        %s

                        <!-- Body -->
                        <tr>
                          <td style="background-color:#1a1d2e;padding:24px 32px 28px;">
                            <p style="margin:0 0 20px;font-size:15px;color:#cbd5e1;line-height:1.6;">
                              %s<br><br>%s
                            </p>

                            <!-- Detail table -->
                            <table width="100%%" cellpadding="0" cellspacing="0"
                                   style="border-collapse:collapse;
                                          border:1px solid #2d3748;border-radius:8px;overflow:hidden;">
                              %s
                            </table>
                          </td>
                        </tr>

                        <!-- Footer note -->
                        <tr>
                          <td style="background-color:#1e2235;
                                     border-top:1px solid #2d3748;
                                     padding:16px 32px;">
                            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
                              💡 %s
                            </p>
                          </td>
                        </tr>

                        %s
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(buildHeader(heading, accentColor), greeting, intro, rowsHtml, footer, buildFooter("© 2026 BookEase · Questions? Contact us at <a href=\"mailto:devsquad45@gmail.com\" style=\"color:#6366f1;\">devsquad45@gmail.com</a>"));
    }

    private String buildAppointmentsTableHtml(List<CancelledAppointmentInfo> appointments) {
        if (appointments == null || appointments.isEmpty()) return "";

        StringBuilder rowsHtml = new StringBuilder();
        for (CancelledAppointmentInfo a : appointments) {
            rowsHtml.append("""
                    <tr>
                      <td style="padding:10px 16px;font-size:13px;color:#f1f5f9;border-bottom:1px solid #2d3748;">%s</td>
                      <td style="padding:10px 16px;font-size:13px;color:#f1f5f9;border-bottom:1px solid #2d3748;">%s</td>
                      <td style="padding:10px 16px;font-size:13px;color:#f1f5f9;border-bottom:1px solid #2d3748;white-space:nowrap;">%s</td>
                      <td style="padding:10px 16px;font-size:13px;color:#f1f5f9;border-bottom:1px solid #2d3748;white-space:nowrap;">%s</td>
                    </tr>
                    """.formatted(a.businessName(), a.serviceName(), a.date(), a.time()));
        }

        return """
                <table width="100%%" cellpadding="0" cellspacing="0"
                       style="border-collapse:collapse;border:1px solid #2d3748;
                              border-radius:8px;overflow:hidden;margin:0 0 20px;">
                  <tr>
                    <td style="padding:8px 16px;font-size:11px;color:#64748b;text-transform:uppercase;
                               letter-spacing:0.06em;border-bottom:1px solid #2d3748;background:#0d0f19;">Business</td>
                    <td style="padding:8px 16px;font-size:11px;color:#64748b;text-transform:uppercase;
                               letter-spacing:0.06em;border-bottom:1px solid #2d3748;background:#0d0f19;">Service</td>
                    <td style="padding:8px 16px;font-size:11px;color:#64748b;text-transform:uppercase;
                               letter-spacing:0.06em;border-bottom:1px solid #2d3748;background:#0d0f19;">Date</td>
                    <td style="padding:8px 16px;font-size:11px;color:#64748b;text-transform:uppercase;
                               letter-spacing:0.06em;border-bottom:1px solid #2d3748;background:#0d0f19;">Time</td>
                  </tr>
                  %s
                </table>
                """.formatted(rowsHtml);
    }

    private String wrapEmailShell(String heading, String accentColor, String bodyHtml, String footerText) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
                <body style="margin:0;padding:0;background-color:#0d0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#0d0f19;padding:40px 16px;">
                    <tr><td align="center">
                      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%%;">
                        %s
                        <tr>
                          <td style="background-color:#1a1d2e;padding:24px 32px 28px;">
                            %s
                          </td>
                        </tr>
                        %s
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(buildHeader(heading, accentColor), bodyHtml, buildFooter(footerText));
    }

    private String userName(org.vaidik.appointment.entity.User user) {
        return (user.getName() != null && !user.getName().isBlank())
                ? user.getName()
                : user.getEmail();
    }
}