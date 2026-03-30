package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.WorkingHoursBulkRequest;
import org.vaidik.appointment.dto.WorkingHoursRequest;
import org.vaidik.appointment.dto.WorkingHoursResponse;
import org.vaidik.appointment.entity.ServiceOffering;
import org.vaidik.appointment.entity.WorkingHours;
import org.vaidik.appointment.repository.ServiceOfferingRepository;
import org.vaidik.appointment.repository.WorkingHoursRepository;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkingHoursService {

    private final WorkingHoursRepository workingHoursRepository;
    private final ServiceOfferingRepository serviceOfferingRepository;

    // ─── GET by Service ────────────────────────────────────────────────────────
    public List<WorkingHoursResponse> getWorkingHoursByService(Long serviceId) {
        return workingHoursRepository.findByServiceId(serviceId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── CREATE / UPSERT single day ────────────────────────────────────────────
    public WorkingHoursResponse createWorkingHours(WorkingHoursRequest request, String ownerEmail) {
        ServiceOffering service = validateOwnership(request.getServiceId(), ownerEmail);

        // Upsert: if a record for this day already exists, update it
        WorkingHours wh = workingHoursRepository
                .findByServiceIdAndDayOfWeek(service.getId(), request.getDayOfWeek())
                .orElse(WorkingHours.builder()
                        .service(service)
                        .dayOfWeek(request.getDayOfWeek())
                        .build());

        wh.setStartTime(request.getStartTime());
        wh.setEndTime(request.getEndTime());
        wh.setOpen(request.isOpen());

        return toResponse(workingHoursRepository.save(wh));
    }

    // ─── UPDATE by ID ──────────────────────────────────────────────────────────
    public WorkingHoursResponse updateWorkingHours(Long id, WorkingHoursRequest request, String ownerEmail) {
        WorkingHours wh = workingHoursRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Working hours record not found"));

        // 🔒 Ownership check via service
        if (!wh.getService().getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Unauthorized");
        }

        if (request.getStartTime() != null) wh.setStartTime(request.getStartTime());
        if (request.getEndTime() != null)   wh.setEndTime(request.getEndTime());
        wh.setOpen(request.isOpen());

        return toResponse(workingHoursRepository.save(wh));
    }

    // ─── BULK SAVE (multi-day) ─────────────────────────────────────────────────
    public List<WorkingHoursResponse> bulkSave(WorkingHoursBulkRequest request, String ownerEmail) {
        ServiceOffering service = validateOwnership(request.getServiceId(), ownerEmail);

        LocalTime start = LocalTime.parse(request.getStartTime());
        LocalTime end   = LocalTime.parse(request.getEndTime());

        List<WorkingHoursResponse> results = new ArrayList<>();

        for (DayOfWeek day : request.getDays()) {
            WorkingHours wh = workingHoursRepository
                    .findByServiceIdAndDayOfWeek(service.getId(), day)
                    .orElse(WorkingHours.builder()
                            .service(service)
                            .dayOfWeek(day)
                            .build());

            wh.setStartTime(start);
            wh.setEndTime(end);
            wh.setOpen(request.isOpen());

            results.add(toResponse(workingHoursRepository.save(wh)));
        }

        return results;
    }

    // ─── Helper: validate ownership ────────────────────────────────────────────
    private ServiceOffering validateOwnership(Long serviceId, String ownerEmail) {
        ServiceOffering service = serviceOfferingRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Service not found"));
        if (!service.getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Unauthorized");
        }
        return service;
    }

    // ─── Helper: entity → response ─────────────────────────────────────────────
    private WorkingHoursResponse toResponse(WorkingHours wh) {
        return WorkingHoursResponse.builder()
                .id(wh.getId())
                .dayOfWeek(wh.getDayOfWeek().name())
                .startTime(wh.getStartTime() != null ? wh.getStartTime().toString() : null)
                .endTime(wh.getEndTime()   != null ? wh.getEndTime().toString()   : null)
                .open(wh.isOpen())
                .serviceId(wh.getService().getId())
                .build();
    }
}