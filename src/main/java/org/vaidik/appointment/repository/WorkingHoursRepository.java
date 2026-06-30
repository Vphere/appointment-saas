package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.entity.WorkingHours;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;

public interface WorkingHoursRepository extends JpaRepository<WorkingHours, Long> {

    @Query("SELECT w FROM WorkingHours w JOIN FETCH w.service WHERE w.service.id = :serviceId")
    List<WorkingHours> findByServiceId(@Param("serviceId") Long serviceId);

    @Query("""
        SELECT w FROM WorkingHours w
        JOIN FETCH w.service s
        JOIN FETCH s.business
        WHERE w.service.id = :serviceId AND w.dayOfWeek = :dayOfWeek
    """)
    Optional<WorkingHours> findByServiceIdAndDayOfWeek(
            @Param("serviceId") Long serviceId,
            @Param("dayOfWeek") DayOfWeek dayOfWeek
    );

    @Query("""
        SELECT w FROM WorkingHours w
        JOIN FETCH w.service s
        JOIN FETCH s.business b
        JOIN FETCH b.owner
        WHERE w.id = :id
    """)
    Optional<WorkingHours> findByIdWithFetch(@Param("id") Long id);

    @Transactional
    void deleteByServiceId(Long serviceId);

    @Modifying
    @Query("DELETE FROM WorkingHours w WHERE w.service.business.id = :businessId")
    void deleteByBusinessId(@Param("businessId") Long businessId);
}
