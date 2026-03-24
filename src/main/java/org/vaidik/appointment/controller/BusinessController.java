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

        System.out.println(authentication.getAuthorities());

        return businessService.createBusiness(
                request,
                authentication.getName()
        );
    }

    // CUSTOMER VIEW (ONLY APPROVED)
    @GetMapping("/approved")
    public List<BusinessResponse> getApprovedBusinesses() {
        return businessService.getApprovedBusinesses();
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

    // APPROVE BUSINESS
    @PutMapping("/{id}/{status}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void updateStatus(@PathVariable Long id, @PathVariable BusinessStatus status) {
        businessService.updateBusinessStatus(id, status);
    }
}