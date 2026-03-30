package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.*;
import org.vaidik.appointment.entity.BusinessStatus;
import org.vaidik.appointment.service.BusinessServiceService;

import java.util.List;

@RestController
@RequestMapping("/api/business")
@RequiredArgsConstructor
public class BusinessController {

    private final BusinessServiceService businessService;

    // CREATE BUSINESS (OWNER)
    @PostMapping
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public BusinessResponse createBusiness(@RequestBody BusinessRequest request, Authentication authentication) {
        return businessService.createBusiness(request, authentication.getName());
    }

    // CUSTOMER VIEW (ONLY APPROVED)
    @GetMapping("/approved")
    public List<BusinessResponse> getApprovedBusinesses() {
        return businessService.getApprovedBusinesses();
    }

    @GetMapping("/{id}")
    public BusinessResponse getBusinessById(@PathVariable Long id) {
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

    // REJECT BUSINESS
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public BusinessResponse reject(@PathVariable("id") Long id) {
        return businessService.updateBusinessStatus(id, BusinessStatus.REJECTED);
    }
}