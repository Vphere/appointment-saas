package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.WorkingHoursBulkRequest;
import org.vaidik.appointment.dto.WorkingHoursRequest;
import org.vaidik.appointment.dto.WorkingHoursResponse;
import org.vaidik.appointment.service.WorkingHoursService;

import java.util.List;

@RestController
@RequestMapping("/api/working-hours")
@RequiredArgsConstructor
public class WorkingHoursController {

    private final WorkingHoursService workingHoursService;

    /** GET all working hours for a specific service */
    @GetMapping("/service/{serviceId}")
    public List<WorkingHoursResponse> getByService(@PathVariable Long serviceId) {
        return workingHoursService.getWorkingHoursByService(serviceId);
    }

    /** CREATE (upsert) a single-day entry */
    @PostMapping
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public WorkingHoursResponse create(
            @RequestBody WorkingHoursRequest request,
            Authentication authentication
    ) {
        return workingHoursService.createWorkingHours(request, authentication.getName());
    }

    /** UPDATE a single-day entry by ID */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public WorkingHoursResponse update(
            @PathVariable Long id,
            @RequestBody WorkingHoursRequest request,
            Authentication authentication
    ) {
        return workingHoursService.updateWorkingHours(id, request, authentication.getName());
    }

    /** BULK save – apply one time range to multiple days */
    @PostMapping("/bulk")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public List<WorkingHoursResponse> bulkSave(
            @RequestBody WorkingHoursBulkRequest request,
            Authentication authentication
    ) {
        return workingHoursService.bulkSave(request, authentication.getName());
    }
}