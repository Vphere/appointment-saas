package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.WorkingHoursRequest;
import org.vaidik.appointment.entity.WorkingHours;
import org.vaidik.appointment.service.WorkingHoursService;

@RestController
@RequestMapping("/api/working-hours")
@RequiredArgsConstructor
public class WorkingHoursController {

    private final WorkingHoursService workingHoursService;

    @PostMapping
    public WorkingHours createWorkingHours(
            @RequestBody WorkingHoursRequest request
    ) {
        return workingHoursService.createWorkingHours(request);
    }
}