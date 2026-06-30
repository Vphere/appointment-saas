package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
@Transactional(readOnly = true)
public class WorkingHoursService {

    private final WorkingHoursRepository workingHoursRepository;
    private final ServiceOfferingRepository serviceOfferingRepository;

    public List<WorkingHoursResponse> getWorkingHoursByService(Long serviceId) {
        return workingHoursRepository.findByServiceId(serviceId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public WorkingHoursResponse createWorkingHours(WorkingHoursRequest request, String ownerEmail) {
        ServiceOffering service = validateOwnership(request.getServiceId(), ownerEmail);

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

    @Transactional
    public WorkingHoursResponse updateWorkingHours(Long id, WorkingHoursRequest request, String ownerEmail) {
        WorkingHours wh = workingHoursRepository.findByIdWithFetch(id)   // ← was findById
                .orElseThrow(() -> new RuntimeException("Working hours record not found"));

        if (!wh.getService().getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Unauthorized");
        }

        if (request.getStartTime() != null) wh.setStartTime(request.getStartTime());
        if (request.getEndTime() != null)   wh.setEndTime(request.getEndTime());
        wh.setOpen(request.isOpen());

        return toResponse(workingHoursRepository.save(wh));
    }

    @Transactional
    public List<WorkingHoursResponse> bulkSave(WorkingHoursBulkRequest request, String ownerEmail) {
        ServiceOffering service = validateOwnership(request.getServiceId(), ownerEmail);

        LocalTime start = LocalTime.parse(request.getStartTime());
        LocalTime end   = LocalTime.parse(request.getEndTime());

        List<WorkingHours> toSave = new ArrayList<>();

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
            toSave.add(wh);
        }

        return workingHoursRepository.saveAll(toSave)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private ServiceOffering validateOwnership(Long serviceId, String ownerEmail) {
        ServiceOffering service = serviceOfferingRepository.findByIdWithFetch(serviceId)   // ← was findById
                .orElseThrow(() -> new RuntimeException("Service not found"));
        if (!service.getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Unauthorized");
        }
        return service;
    }

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