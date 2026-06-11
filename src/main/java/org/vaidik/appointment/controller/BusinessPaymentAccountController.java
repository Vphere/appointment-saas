package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.BusinessPaymentAccountRequest;
import org.vaidik.appointment.dto.BusinessPaymentAccountResponse;
import org.vaidik.appointment.service.BusinessPaymentAccountService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payment-accounts")
@RequiredArgsConstructor
public class BusinessPaymentAccountController {

    private final BusinessPaymentAccountService service;

    // Get all accounts for a business
    @GetMapping("/business/{businessId}")
    public ResponseEntity<List<BusinessPaymentAccountResponse>> getAccounts(
            @PathVariable Long businessId,
            Authentication auth) {
        return ResponseEntity.ok(service.getAccounts(businessId, auth.getName()));
    }

    // Add new account
    @PostMapping
    public ResponseEntity<BusinessPaymentAccountResponse> addAccount(
            @RequestBody BusinessPaymentAccountRequest req,
            Authentication auth) {
        return ResponseEntity.ok(service.addAccount(req, auth.getName()));
    }

    // Set an account as default
    @PatchMapping("/{id}/set-default")
    public ResponseEntity<BusinessPaymentAccountResponse> setDefault(
            @PathVariable Long id,
            Authentication auth) {
        return ResponseEntity.ok(service.setDefault(id, auth.getName()));
    }

    // Soft delete an account
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteAccount(
            @PathVariable Long id,
            Authentication auth) {
        service.deleteAccount(id, auth.getName());
        return ResponseEntity.ok(Map.of("message", "Account removed"));
    }
}