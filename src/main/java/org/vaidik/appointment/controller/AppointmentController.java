package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.CreateAppointmentRequest;
import org.vaidik.appointment.dto.AppointmentResponse;
import org.vaidik.appointment.dto.UpdateAppointmentStatusRequest;
import org.vaidik.appointment.entity.AppointmentStatus;
import org.vaidik.appointment.service.AppointmentService;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @PostMapping
    public AppointmentResponse bookAppointment(@RequestBody CreateAppointmentRequest request,
                                               Authentication authentication) {
        return appointmentService.bookAppointment(
                request,
                authentication.getName()   // 🔥 email from JWT
        );
    }

    @GetMapping("/my")
    public List<AppointmentResponse> getMyAppointments(Authentication authentication) {
        return appointmentService.getUserAppointments(authentication.getName());
    }

    @GetMapping("/my-business")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public List<AppointmentResponse> getMyBusinessAppointments(Authentication authentication) {
        return appointmentService.getAppointmentsForOwner(authentication.getName());
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public AppointmentResponse updateStatus(
            @PathVariable Long id,
            @RequestBody UpdateAppointmentStatusRequest request,
            Authentication authentication
    ) {
        return appointmentService.updateAppointmentStatus(
                id,
                request.getStatus(),
                authentication.getName()
        );
    }
}