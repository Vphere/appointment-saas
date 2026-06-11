package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.*;
import org.vaidik.appointment.service.PaymentService;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // Customer creates Razorpay order after booking slot
    @PostMapping("/create-order")
    public ResponseEntity<CreateOrderResponse> createOrder(
            @RequestBody CreateOrderRequest req, Authentication auth) {
        return ResponseEntity.ok(paymentService.createOrder(req.getAppointmentId(), auth.getName()));
    }

    // Frontend calls this after Razorpay payment success callback
    @PostMapping("/verify")
    public ResponseEntity<AppointmentResponse> verifyPayment(
            @RequestBody VerifyPaymentRequest req, Authentication auth) {
        return ResponseEntity.ok(
                paymentService.verifyPayment(req, auth.getName()));
    }

    // Owner clicks "Mark Service Rendered" — triggers OTP + consent link
    @PostMapping("/initiate-completion/{appointmentId}")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public ResponseEntity<Map<String, String>> initiateCompletion(
            @PathVariable Long appointmentId,
            Authentication auth) {
        paymentService.initiateCompletion(appointmentId, auth.getName());
        return ResponseEntity.ok(Map.of(
                "message", "OTP sent to customer. Ask them to share it with you."));
    }

    // Owner enters OTP shared by customer
    @PostMapping("/confirm-otp")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public ResponseEntity<Map<String, String>> confirmByOtp(
            @RequestBody OtpVerifyRequest req,
            Authentication auth) {
        paymentService.confirmByOtp(req, auth.getName());
        return ResponseEntity.ok(Map.of("message", "Appointment marked as completed"));
    }

    // Public — customer opens email link (no auth)
    @GetMapping("/consent/{token}")
    public ResponseEntity<ConsentResponse> getConsentDetails(
            @PathVariable String token) {
        return ResponseEntity.ok(paymentService.getConsentDetails(token));
    }

    // Public — customer confirms via email link
    @PostMapping("/consent/{token}/confirm")
    public ResponseEntity<Map<String, String>> confirmByLink(
            @PathVariable String token) {
        paymentService.confirmByLink(token);
        return ResponseEntity.ok(Map.of("message", "Service confirmed. Thank you!"));
    }

    // Public — customer disputes via email link
    @PostMapping("/consent/{token}/dispute")
    public ResponseEntity<Map<String, String>> disputeByLink(
            @PathVariable String token,
            @RequestBody Map<String, String> body) {
        paymentService.disputeByLink(token, body.getOrDefault("reason", ""));
        return ResponseEntity.ok(Map.of(
                "message", "Dispute recorded. Our team will contact you within 24 hours."));
    }
}