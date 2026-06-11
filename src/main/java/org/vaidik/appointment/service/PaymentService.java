package org.vaidik.appointment.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Refund;
import lombok.RequiredArgsConstructor;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.dto.*;
import org.vaidik.appointment.entity.*;
import org.vaidik.appointment.repository.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final AppointmentRepository        appointmentRepository;
    private final PaymentRepository            paymentRepository;
    private final ServiceCompletionConsentRepository consentRepository;
    private final UserRepository               userRepository;
    private final EmailService                 emailService;

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    @Value("${razorpay.deposit.percent:30}")
    private int depositPercent;

    @Value("${razorpay.currency:INR}")
    private String currency;

    // Platform fee percentage
    private static final double PLATFORM_FEE_PERCENT = 2.0;

    // ── 1. Create Razorpay Order ──────────────────────────────────────────────

    @Transactional
    public CreateOrderResponse createOrder(Long appointmentId, String userEmail) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        // Verify this appointment belongs to this user
        if (!appointment.getUser().getEmail().equals(userEmail)) {
            throw new RuntimeException("Unauthorized");
        }

        // Don't allow creating order if already paid
        if (appointment.getPaymentStatus() != PaymentStatus.PENDING_PAYMENT) {
            throw new RuntimeException("Payment already initiated for this appointment");
        }

        ServiceOffering service = appointment.getService();
        BigDecimal totalPrice   = BigDecimal.valueOf(service.getPrice());

        // Calculate deposit (30% of total)
        BigDecimal depositAmount = totalPrice
                .multiply(BigDecimal.valueOf(depositPercent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        // Calculate platform fee (2% of deposit)
        BigDecimal platformFee = depositAmount
                .multiply(BigDecimal.valueOf(PLATFORM_FEE_PERCENT))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        BigDecimal payoutAmount = depositAmount.subtract(platformFee);

        // Razorpay expects amount in paise (1 rupee = 100 paise)
        int amountInPaise = depositAmount.multiply(BigDecimal.valueOf(100)).intValue();

        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount",   amountInPaise);
            orderRequest.put("currency", currency);
            orderRequest.put("receipt",  "appt_" + appointmentId);

            Order order = client.orders.create(orderRequest);
            String razorpayOrderId = order.get("id");

            // Save payment record
            Payment payment = Payment.builder()
                    .appointment(appointment)
                    .razorpayOrderId(razorpayOrderId)
                    .amount(totalPrice)
                    .depositAmount(depositAmount)
                    .currency(currency)
                    .status("CREATED")
                    .build();
            paymentRepository.save(payment);

            // Save amounts on appointment
            appointment.setDepositAmount(depositAmount);
            appointment.setPlatformFee(platformFee);
            appointment.setPayoutAmount(payoutAmount);
            appointmentRepository.save(appointment);

            return CreateOrderResponse.builder()
                    .orderId(razorpayOrderId)
                    .amount(totalPrice)
                    .depositAmount(depositAmount)
                    .currency(currency)
                    .keyId(keyId)
                    .businessName(appointment.getBusiness().getName())
                    .serviceName(service.getName())
                    .customerName(appointment.getUser().getName())
                    .customerEmail(appointment.getUser().getEmail())
                    .build();

        } catch (RazorpayException e) {
            throw new RuntimeException("Failed to create Razorpay order: " + e.getMessage());
        }
    }

    // ── 2. Verify Payment (Frontend Callback) ────────────────────────────────

    @Transactional
    public AppointmentResponse verifyPayment(VerifyPaymentRequest req, String userEmail) {
        // Verify HMAC signature
        String expectedSignature = generateHmac(
                req.getRazorpayOrderId() + "|" + req.getRazorpayPaymentId(),
                keySecret
        );

        if (!expectedSignature.equals(req.getRazorpaySignature())) {
            throw new RuntimeException("Payment verification failed: invalid signature");
        }

        // Find payment by order ID
        Payment payment = paymentRepository.findByRazorpayOrderId(req.getRazorpayOrderId())
                .orElseThrow(() -> new RuntimeException("Payment record not found"));

        Appointment appointment = payment.getAppointment();

        if (!appointment.getUser().getEmail().equals(userEmail)) {
            throw new RuntimeException("Unauthorized");
        }

        // Update payment record
        payment.setRazorpayPaymentId(req.getRazorpayPaymentId());
        payment.setRazorpaySignature(req.getRazorpaySignature());
        payment.setStatus("CAPTURED");
        paymentRepository.save(payment);

        // Update appointment payment status
        appointment.setPaymentStatus(PaymentStatus.DEPOSIT_PAID);
        appointmentRepository.save(appointment);

        // Send confirmation email to customer
        try {
            emailService.sendDepositConfirmationEmail(appointment, payment);
        } catch (Exception e) {
            System.err.println("Deposit confirmation email failed: " + e.getMessage());
        }

        return toAppointmentResponse(appointment);
    }

    // ── 3. Initiate Refund ───────────────────────────────────────────────────

    @Transactional
    public void initiateRefund(Appointment appointment) {
        Payment payment = paymentRepository.findByAppointmentId(appointment.getId())
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (!"CAPTURED".equals(payment.getStatus())) {
            return; // Nothing to refund
        }

        // Calculate refund zone
        java.time.LocalDateTime appointmentDateTime = java.time.LocalDateTime.of(
                appointment.getAppointmentDate(),
                appointment.getAppointmentTime()
        );
        long hoursUntilAppointment = java.time.Duration.between(
                LocalDateTime.now(), appointmentDateTime
        ).toHours();

        BigDecimal refundAmount;
        PaymentStatus newPaymentStatus;

        if (hoursUntilAppointment >= 48) {
            // Zone 1: Full refund
            refundAmount     = payment.getDepositAmount();
            newPaymentStatus = PaymentStatus.CANCELLED_REFUNDED;
        } else if (hoursUntilAppointment >= 24) {
            // Zone 2: 50% refund
            refundAmount     = payment.getDepositAmount()
                    .divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
            newPaymentStatus = PaymentStatus.CANCELLED_PARTIAL;
        } else {
            // Zone 3: No refund
            refundAmount     = BigDecimal.ZERO;
            newPaymentStatus = PaymentStatus.CANCELLED_NO_REFUND;
        }

        // Call Razorpay refund API (only if refund amount > 0)
        if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            try {
                RazorpayClient client = new RazorpayClient(keyId, keySecret);
                JSONObject refundRequest = new JSONObject();
                refundRequest.put("amount",
                        refundAmount.multiply(BigDecimal.valueOf(100)).intValue());
                Refund refund = client.payments.refund(
                        payment.getRazorpayPaymentId(), refundRequest);
                payment.setRefundId(refund.get("id"));
                payment.setRefundStatus("INITIATED");
            } catch (RazorpayException e) {
                System.err.println("Razorpay refund failed: " + e.getMessage());
                payment.setRefundStatus("FAILED");
            }
        }

        payment.setRefundAmount(refundAmount);
        payment.setStatus("REFUND_INITIATED");
        paymentRepository.save(payment);

        appointment.setPaymentStatus(newPaymentStatus);
        appointmentRepository.save(appointment);

        // Notify customer about refund
        try {
            emailService.sendRefundNotificationEmail(appointment, refundAmount, newPaymentStatus);
        } catch (Exception e) {
            System.err.println("Refund notification email failed: " + e.getMessage());
        }
    }

    // ── 4. Initiate Service Completion Consent (OTP + Link) ──────────────────

//    @Transactional
//    public void initiateCompletion(Long appointmentId, String ownerEmail) {
//        Appointment appointment = appointmentRepository.findById(appointmentId)
//                .orElseThrow(() -> new RuntimeException("Appointment not found"));
//
//        // Verify owner
//        if (!appointment.getBusiness().getOwner().getEmail().equals(ownerEmail)) {
//            throw new RuntimeException("Not authorized");
//        }
//
//        if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
//            throw new RuntimeException("Only CONFIRMED appointments can be marked for completion");
//        }
//
//        // Check if consent already exists
//        consentRepository.findByAppointmentId(appointmentId).ifPresent(existing -> {
//            if (!existing.getIsUsed() && existing.getResendCount() >= 3) {
//                throw new RuntimeException("Max OTP resend attempts reached");
//            }
//            consentRepository.delete(existing); // Delete old one, create fresh
//        });
//
//        // Generate 6-digit OTP
//        String otp        = String.valueOf((int)(Math.random() * 900000) + 100000);
//        String otpHash    = hashOtp(otp);
//        String token      = UUID.randomUUID().toString();
//        LocalDateTime exp = LocalDateTime.now().plusMinutes(30);
//
//        ServiceCompletionConsent consent = ServiceCompletionConsent.builder()
//                .appointment(appointment)
//                .otpHash(otpHash)
//                .consentToken(token)
//                .expiresAt(exp)
//                .isUsed(false)
//                .resendCount(0)
//                .createdAt(LocalDateTime.now())
//                .build();
//        consentRepository.save(consent);
//
//        // Update appointment status
//        appointment.setStatus(AppointmentStatus.CONFIRMED); // stays CONFIRMED until consent
//        appointment.setPaymentStatus(PaymentStatus.AWAITING_CONSENT);
//        appointmentRepository.save(appointment);
//
//        // Send OTP + link to customer
//        try {
//            emailService.sendCompletionConsentEmail(appointment, otp, token);
//        } catch (Exception e) {
//            System.err.println("Consent email failed: " + e.getMessage());
//        }
//    }

    @Transactional
    public void initiateCompletion(Long appointmentId, String ownerEmail) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Not authorized");
        }

        if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new RuntimeException("Only CONFIRMED appointments can be marked for completion");
        }

        // Check if consent already exists — delete and flush BEFORE inserting new one
        consentRepository.findByAppointmentId(appointmentId).ifPresent(existing -> {
            if (existing.getResendCount() >= 3) {
                throw new RuntimeException("Max OTP resend attempts (3) reached for this appointment");
            }
            consentRepository.delete(existing);
            consentRepository.flush(); // ← critical: force DELETE to execute before INSERT
        });

        String otp        = String.valueOf((int)(Math.random() * 900000) + 100000);
        String otpHash    = hashOtp(otp);
        String token      = UUID.randomUUID().toString();
        LocalDateTime exp = LocalDateTime.now().plusMinutes(30);

        ServiceCompletionConsent consent = ServiceCompletionConsent.builder()
                .appointment(appointment)
                .otpHash(otpHash)
                .consentToken(token)
                .expiresAt(exp)
                .isUsed(false)
                .resendCount(0)
                .createdAt(LocalDateTime.now())
                .build();
        consentRepository.save(consent);

        appointment.setPaymentStatus(PaymentStatus.AWAITING_CONSENT);
        appointmentRepository.save(appointment);

        try {
            emailService.sendCompletionConsentEmail(appointment, otp, token);
        } catch (Exception e) {
            System.err.println("Consent email failed: " + e.getMessage());
        }
    }

    // ── 5. Validate OTP (owner enters OTP from customer) ─────────────────────

    @Transactional
    public void confirmByOtp(OtpVerifyRequest req, String ownerEmail) {
        Appointment appointment = appointmentRepository.findById(req.getAppointmentId())
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (!appointment.getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Not authorized");
        }

        ServiceCompletionConsent consent = consentRepository
                .findByAppointmentId(req.getAppointmentId())
                .orElseThrow(() -> new RuntimeException("No consent record found. Please initiate completion first."));

        validateAndMarkConsent(consent, req.getOtp(), appointment, "OTP");
    }

    // ── 6. Validate Link (customer clicks email link) ─────────────────────────

    @Transactional
    public ConsentResponse getConsentDetails(String token) {
        ServiceCompletionConsent consent = consentRepository.findByConsentToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired link"));

        if (consent.getIsUsed()) {
            throw new RuntimeException("This confirmation link has already been used");
        }
        if (LocalDateTime.now().isAfter(consent.getExpiresAt())) {
            throw new RuntimeException("This link has expired. Please ask the service provider to resend.");
        }

        Appointment appt = consent.getAppointment();
        return ConsentResponse.builder()
                .appointmentId(appt.getId())
                .businessName(appt.getBusiness().getName())
                .serviceName(appt.getService().getName())
                .customerName(appt.getUser().getName())
                .appointmentDate(appt.getAppointmentDate().toString())
                .appointmentTime(appt.getAppointmentTime().toString())
                .build();
    }

    @Transactional
    public void confirmByLink(String token) {
        ServiceCompletionConsent consent = consentRepository.findByConsentToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid link"));

        if (consent.getIsUsed()) {
            throw new RuntimeException("Already used");
        }
        if (LocalDateTime.now().isAfter(consent.getExpiresAt())) {
            throw new RuntimeException("Link expired");
        }

        Appointment appointment = consent.getAppointment();
        validateAndMarkConsent(consent, null, appointment, "LINK");
    }

    @Transactional
    public void disputeByLink(String token, String reason) {
        ServiceCompletionConsent consent = consentRepository.findByConsentToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid link"));

        Appointment appointment = consent.getAppointment();
        appointment.setStatus(AppointmentStatus.CONFIRMED); // keep as confirmed until resolved
        appointment.setPaymentStatus(PaymentStatus.DISPUTED);
        appointmentRepository.save(appointment);

        consent.setIsUsed(true);
        consentRepository.save(consent);

        // TODO: Create PaymentDispute record here when you add that entity
        System.out.println("DISPUTE raised for appointment " + appointment.getId() + ": " + reason);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

//    private void validateAndMarkConsent(ServiceCompletionConsent consent,
//                                        String otp,
//                                        Appointment appointment,
//                                        String resolvedBy) {
//        if ("OTP".equals(resolvedBy)) {
//            if (!verifyOtp(otp, consent.getOtpHash())) {
//                throw new RuntimeException("Invalid OTP");
//            }
//            if (LocalDateTime.now().isAfter(consent.getExpiresAt())) {
//                throw new RuntimeException("OTP has expired");
//            }
//        }
//
//        consent.setIsUsed(true);
//        consent.setResolvedBy(resolvedBy);
//        consentRepository.save(consent);
//
//        // Mark appointment as COMPLETED
//        appointment.setStatus(AppointmentStatus.COMPLETED);
//        appointment.setPaymentStatus(PaymentStatus.COMPLETED);
//        appointmentRepository.save(appointment);
//
//        // Send completion emails
//        try {
//            emailService.sendServiceCompletedEmail(appointment);
//        } catch (Exception e) {
//            System.err.println("Completion email failed: " + e.getMessage());
//        }
//    }

    private void validateAndMarkConsent(ServiceCompletionConsent consent,
                                        String otp,
                                        Appointment appointment,
                                        String resolvedBy) {
        if ("OTP".equals(resolvedBy)) {
            if (!verifyOtp(otp, consent.getOtpHash())) {
                throw new RuntimeException("Invalid OTP");
            }
            if (LocalDateTime.now().isAfter(consent.getExpiresAt())) {
                throw new RuntimeException("OTP has expired");
            }
        }

        consent.setIsUsed(true);
        consent.setResolvedBy(resolvedBy);
        consentRepository.save(consent);

        // Service confirmed by customer — waiting for remaining 70% payment
        // Owner will mark as fully paid after collecting remaining amount
        appointment.setStatus(AppointmentStatus.AWAITING_REMAINING_PAYMENT);
        appointment.setPaymentStatus(PaymentStatus.AWAITING_CONSENT); // keeps payment status
        appointmentRepository.save(appointment);

        try {
            emailService.sendServiceConfirmedEmail(appointment);
        } catch (Exception e) {
            System.err.println("Service confirmed email failed: " + e.getMessage());
        }
    }

    private String generateHmac(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("HMAC generation failed", e);
        }
    }

    private String hashOtp(String otp) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(otp.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Hash failed", e);
        }
    }

    private boolean verifyOtp(String otp, String storedHash) {
        return hashOtp(otp).equals(storedHash);
    }

    private AppointmentResponse toAppointmentResponse(Appointment a) {
        return AppointmentResponse.builder()
                .id(a.getId())
                .userId(a.getUser().getId())
                .userName(a.getUser().getName())
                .userEmail(a.getUser().getEmail())
                .businessId(a.getBusiness().getId())
                .businessName(a.getBusiness().getName())
                .serviceId(a.getService().getId())
                .serviceName(a.getService().getName())
                .price(a.getService().getPrice())
                .appointmentDate(a.getAppointmentDate())
                .appointmentTime(a.getAppointmentTime())
                .status(a.getStatus())
                .reviewed(a.getReviewed())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}