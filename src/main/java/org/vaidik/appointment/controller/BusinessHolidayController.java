package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.BusinessHolidayRequest;
import org.vaidik.appointment.dto.BusinessHolidayResponse;
import org.vaidik.appointment.service.BusinessHolidayService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/holidays")
@RequiredArgsConstructor
public class BusinessHolidayController {

    private final BusinessHolidayService holidayService;

    // Owner views all holidays for a business
    @GetMapping("/business/{businessId}")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public List<BusinessHolidayResponse> getByBusiness(@PathVariable Long businessId) {
        return holidayService.getHolidays(businessId);
    }

    // Owner views holidays for a specific service (+ business-wide ones)
    @GetMapping("/service/{serviceId}")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public List<BusinessHolidayResponse> getByService(@PathVariable Long serviceId) {
        return holidayService.getHolidaysByService(serviceId);
    }

    // SlotService calls this publicly to block slots — no auth needed
    @GetMapping("/public/service/{serviceId}")
    public List<BusinessHolidayResponse> getByServicePublic(@PathVariable Long serviceId) {
        return holidayService.getHolidaysByService(serviceId);
    }

    @PostMapping
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public BusinessHolidayResponse addHoliday( @RequestBody BusinessHolidayRequest request,
                                                Authentication authentication) {
        return holidayService.addHoliday(request, authentication.getName());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public ResponseEntity<Map<String, String>> deleteHoliday( @PathVariable Long id,
                                                                Authentication authentication) {
        holidayService.deleteHoliday(id, authentication.getName());
        return ResponseEntity.ok(Map.of("message", "Holiday deleted"));
    }
}