package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.vaidik.appointment.entity.WorkingHours;

import java.time.DayOfWeek;
import java.util.Optional;

public interface WorkingHoursRepository extends JpaRepository<WorkingHours, Long> {

    Optional<WorkingHours> findByBusinessIdAndDayOfWeek(
            Long businessId,
            DayOfWeek dayOfWeek
    );
}