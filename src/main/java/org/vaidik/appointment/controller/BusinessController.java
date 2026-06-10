package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.*;
import org.vaidik.appointment.entity.BusinessStatus;
import org.vaidik.appointment.service.BusinessAnalyticsService;
import org.vaidik.appointment.service.BusinessServiceService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/business")
@RequiredArgsConstructor
public class BusinessController {

    private final BusinessServiceService businessService;
    private final BusinessAnalyticsService analyticsService;

    // CREATE BUSINESS (OWNER)
    @PostMapping
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public BusinessResponse createBusiness(@RequestBody BusinessRequest request, Authentication authentication) {
        return businessService.createBusiness(request, authentication.getName());
    }

    @GetMapping
    public List<BusinessResponse> getBusinesses() {
        return businessService.getApprovedBusinesses();
    }

    // CUSTOMER VIEW (ONLY APPROVED)
    @GetMapping("/approved")
    public List<BusinessResponse> getApprovedBusinesses() {
        return businessService.getApprovedBusinesses();
    }

    @GetMapping("/{id}")
    public BusinessResponse getBusinessById(@PathVariable("id") Long id) {
        return businessService.getBusinessById(id);
    }

    // OWNER VIEW (ONLY THEIR BUSINESS)
    @GetMapping("/my")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public List<BusinessResponse> getMyBusinesses(Authentication authentication) {
        return businessService.getMyBusinesses(authentication.getName());
    }

    // ADMIN VIEW (ALL)
    @GetMapping("/all")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public List<BusinessResponse> getAllBusinesses() {
        return businessService.getAllBusinesses();
    }

    // ADMIN VIEW (PENDING ONLY)
    @GetMapping("/pending")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public List<BusinessResponse> getPendingBusinesses() {
        return businessService.getPendingBusinesses();
    }

    // APPROVE BUSINESS (explicit PathVariable names to avoid Spring binding issues)
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public BusinessResponse approve(@PathVariable("id") Long id) {
        return businessService.updateBusinessStatus(id, BusinessStatus.APPROVED);
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public BusinessAnalyticsResponse getAnalytics(Authentication authentication) {
        return analyticsService.getAnalytics(authentication.getName());
    }

    // REJECT WITH REASON (admin)
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public BusinessResponse reject(@PathVariable("id") Long id, @RequestBody RejectBusinessRequest request) {
        return businessService.rejectBusiness(id, request);
    }

    // RESUBMIT (owner — rejected businesses only)
    @PutMapping("/{id}/resubmit")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public BusinessResponse resubmit(@PathVariable("id") Long id, @RequestBody BusinessRequest request,
                                        Authentication authentication) {
        return businessService.resubmitBusiness(id, request, authentication.getName());
    }

    // Step 1: preflight check — returns counts, does NOT send OTP yet
    @GetMapping("/{id}/delete-preflight")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public ResponseEntity<DeleteBusinessPreflightResponse> deletePreflightCheck(
            @PathVariable("id") Long id,
            Authentication authentication) {
        return ResponseEntity.ok(
                businessService.getDeletePreflight(id, authentication.getName())
        );
    }

    // Step 2: Owner requests deletion → sends OTP to their email
    @PostMapping("/{id}/request-delete")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public ResponseEntity<?> requestDelete(@PathVariable("id") Long id, Authentication authentication) {
        businessService.initiateDeleteRequest(id, authentication.getName());
        return ResponseEntity.ok(Map.of("message",
                "A verification code has been sent to your email. " +
                        "Enter it along with the business name to confirm deletion."));
    }

    // Step 3: Owner confirms deletion with OTP + typed business name
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public ResponseEntity<Void> deleteBusiness(@PathVariable("id") Long id, @RequestBody DeleteBusinessRequest request,
                                                Authentication authentication) {
        businessService.softDeleteBusiness(id, request, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}