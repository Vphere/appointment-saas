package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.DashboardResponse;
import org.vaidik.appointment.service.DashboardService;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/business/{businessId}")
    public DashboardResponse getDashboard(@PathVariable Long businessId) {
        return dashboardService.getBusinessDashboard(businessId);
    }
}