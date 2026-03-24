package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.WorkingHoursRequest;
import org.vaidik.appointment.entity.Business;
import org.vaidik.appointment.entity.WorkingHours;
import org.vaidik.appointment.repository.BusinessRepository;
import org.vaidik.appointment.repository.WorkingHoursRepository;

@Service
@RequiredArgsConstructor
public class WorkingHoursService {

    private final WorkingHoursRepository workingHoursRepository;
    private final BusinessRepository businessRepository;

    public WorkingHours createWorkingHours(WorkingHoursRequest request) {

        Business business = businessRepository.findById(request.getBusinessId())
                .orElseThrow(() -> new RuntimeException("Business not found"));

        WorkingHours workingHours = WorkingHours.builder()
                .business(business)
                .dayOfWeek(request.getDayOfWeek())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .build();

        return workingHoursRepository.save(workingHours);
    }
}