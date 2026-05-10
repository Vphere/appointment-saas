package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.BusinessAnalyticsResponse;
import org.vaidik.appointment.entity.*;
import org.vaidik.appointment.repository.*;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BusinessAnalyticsService {

    private final BusinessRepository businessRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;

    public BusinessAnalyticsResponse getAnalytics(String ownerEmail) {

        User owner = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Business> businesses = businessRepository.findByOwnerId(owner.getId());

        // Collect all appointments across all owner's businesses
        List<Appointment> allAppointments = businesses.stream()
                .flatMap(b -> appointmentRepository.findByBusinessId(b.getId()).stream())
                .toList();

        List<Appointment> completed = allAppointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED)
                .toList();

        // ── KPIs ──────────────────────────────────────────────────────────────
        double totalRevenue = completed.stream()
                .mapToDouble(a -> a.getService().getPrice())
                .sum();

        long totalCompleted  = completed.size();
        long totalCancelled  = allAppointments.stream().filter(a -> a.getStatus() == AppointmentStatus.CANCELLED).count();
        long totalPending    = allAppointments.stream().filter(a -> a.getStatus() == AppointmentStatus.PENDING).count();
        long totalConfirmed  = allAppointments.stream().filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED).count();

        // ── Revenue by Month (completed only) ─────────────────────────────────
        Map<String, Double> revenueByMonth = completed.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getAppointmentDate().getYear() + "-"
                                + String.format("%02d", a.getAppointmentDate().getMonthValue()),
                        TreeMap::new,
                        Collectors.summingDouble(a -> a.getService().getPrice())
                ));

        // ── Appointments by Month (all statuses) ──────────────────────────────
        Map<String, Long> appointmentsByMonth = allAppointments.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getAppointmentDate().getYear() + "-"
                                + String.format("%02d", a.getAppointmentDate().getMonthValue()),
                        TreeMap::new,
                        Collectors.counting()
                ));

        // ── Revenue by Service ────────────────────────────────────────────────
        Map<String, Double> revenueByService = completed.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getService().getName(),
                        Collectors.summingDouble(a -> a.getService().getPrice())
                ));

        // ── Revenue by Business ───────────────────────────────────────────────
        Map<String, Double> revenueByBusiness = completed.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getBusiness().getName(),
                        Collectors.summingDouble(a -> a.getService().getPrice())
                ));

        // ── Recent Completed Appointments (last 10) ───────────────────────────
        List<BusinessAnalyticsResponse.RecentAppointmentDTO> recent = completed.stream()
                .sorted(Comparator.comparing(Appointment::getAppointmentDate).reversed())
                .limit(10)
                .map(a -> BusinessAnalyticsResponse.RecentAppointmentDTO.builder()
                        .customerName(a.getUser().getName())
                        .serviceName(a.getService().getName())
                        .businessName(a.getBusiness().getName())
                        .date(a.getAppointmentDate().toString())
                        .revenue(a.getService().getPrice())
                        .status(a.getStatus().name())
                        .build())
                .toList();

        return BusinessAnalyticsResponse.builder()
                .totalRevenue(totalRevenue)
                .totalCompleted(totalCompleted)
                .totalCancelled(totalCancelled)
                .totalPending(totalPending)
                .totalConfirmed(totalConfirmed)
                .totalAppointments(allAppointments.size())
                .revenueByMonth(revenueByMonth)
                .appointmentsByMonth(appointmentsByMonth)
                .revenueByService(revenueByService)
                .revenueByBusiness(revenueByBusiness)
                .recentCompletedAppointments(recent)
                .build();
    }
}