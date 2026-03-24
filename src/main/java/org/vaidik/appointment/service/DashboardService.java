package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.DashboardResponse;
import org.vaidik.appointment.entity.AppointmentStatus;
import org.vaidik.appointment.repository.AppointmentRepository;
import org.vaidik.appointment.repository.ServiceOfferingRepository;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final AppointmentRepository appointmentRepository;
    private final ServiceOfferingRepository serviceRepository;

    public DashboardResponse getBusinessDashboard(Long businessId) {

        long totalBookings = appointmentRepository.countByBusinessId(businessId);

        long pending = appointmentRepository.countByBusinessIdAndStatus(
                businessId, AppointmentStatus.PENDING);

        long completed = appointmentRepository.countByBusinessIdAndStatus(
                businessId, AppointmentStatus.COMPLETED);

        long totalServices = serviceRepository.countByBusinessId(businessId);

        return DashboardResponse.builder()
                .totalBookings(totalBookings)
                .pendingBookings(pending)
                .completedBookings(completed)
                .totalServices(totalServices)
                .build();
    }
}