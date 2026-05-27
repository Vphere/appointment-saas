package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.entity.WorkingHours;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;

public interface WorkingHoursRepository extends JpaRepository<WorkingHours, Long> {

    List<WorkingHours> findByServiceId(Long serviceId);

    Optional<WorkingHours> findByServiceIdAndDayOfWeek(Long serviceId, DayOfWeek dayOfWeek);

    @Transactional
    void deleteByServiceId(Long serviceId);
}