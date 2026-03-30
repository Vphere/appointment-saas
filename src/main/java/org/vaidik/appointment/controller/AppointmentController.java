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

        return appointmentService.bookAppointment(request, authentication.getName());
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

    /** Generic status update (used by PUT endpoint) */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public AppointmentResponse updateStatus(@PathVariable("id") Long id,
                                            @RequestBody UpdateAppointmentStatusRequest request,
                                            Authentication authentication) {
        
        return appointmentService.updateAppointmentStatus(id, request.getStatus(), authentication.getName());
    }

//    @PutMapping("/{id}/status-debug")
//    public AppointmentResponse updateStatusDebug(@PathVariable("id") Long id,
//                                                 @RequestBody UpdateAppointmentStatusRequest request,
//                                                 Authentication authentication) {
//
//        return appointmentService.updateAppointmentStatus(id, request.getStatus(), authentication.getName());
//    }

    @PatchMapping("/{id}/confirm")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public AppointmentResponse confirm(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return appointmentService.updateAppointmentStatus(id, AppointmentStatus.CONFIRMED, authentication.getName());
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public AppointmentResponse reject(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return appointmentService.updateAppointmentStatus(id, AppointmentStatus.CANCELLED, authentication.getName());
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public AppointmentResponse complete(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return appointmentService.updateAppointmentStatus(id, AppointmentStatus.COMPLETED, authentication.getName());
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public AppointmentResponse cancel(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return appointmentService.cancelByUser(id, authentication.getName());
    }

    @PutMapping("/{id}/reschedule")
    @PreAuthorize("hasRole('CUSTOMER')")
    public AppointmentResponse reschedule(
            @PathVariable Long id,
            @RequestBody CreateAppointmentRequest request,
            Authentication authentication
    ) {
        return appointmentService.rescheduleAppointment(id, request, authentication.getName());
    }
}