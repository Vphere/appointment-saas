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

    private final BusinessRepository    businessRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository        userRepository;

    public BusinessAnalyticsResponse getAnalytics(String ownerEmail) {

        User owner = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Business> businesses = businessRepository.findByOwnerId(owner.getId());

        // Use first approved business as primary businessId for Reviews tab
        Long primaryBusinessId = businesses.stream()
                .filter(b -> b.getStatus() == BusinessStatus.APPROVED)
                .findFirst()
                .map(Business::getId)
                .orElse(businesses.isEmpty() ? null : businesses.get(0).getId());

        List<Appointment> allAppointments = businesses.stream()
                .flatMap(b -> appointmentRepository.findByBusinessId(b.getId()).stream())
                .toList();

        List<Appointment> completed = allAppointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED)
                .toList();

        double totalRevenue   = completed.stream().mapToDouble(a -> a.getService().getPrice()).sum();
        long totalCompleted   = completed.size();
        long totalCancelled   = allAppointments.stream().filter(a -> a.getStatus() == AppointmentStatus.CANCELLED).count();
        long totalPending     = allAppointments.stream().filter(a -> a.getStatus() == AppointmentStatus.PENDING).count();
        long totalConfirmed   = allAppointments.stream().filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED).count();

        Map<String, Double> revenueByMonth = completed.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getAppointmentDate().getYear() + "-"
                                + String.format("%02d", a.getAppointmentDate().getMonthValue()),
                        TreeMap::new,
                        Collectors.summingDouble(a -> a.getService().getPrice())
                ));

        Map<String, Long> appointmentsByMonth = allAppointments.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getAppointmentDate().getYear() + "-"
                                + String.format("%02d", a.getAppointmentDate().getMonthValue()),
                        TreeMap::new,
                        Collectors.counting()
                ));

        Map<String, Double> revenueByService = completed.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getService().getName(),
                        Collectors.summingDouble(a -> a.getService().getPrice())
                ));

        Map<String, Double> revenueByBusiness = completed.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getBusiness().getName(),
                        Collectors.summingDouble(a -> a.getService().getPrice())
                ));

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
                .businessId(primaryBusinessId)          // ← NEW
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