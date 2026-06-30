package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.entity.BusinessHoliday;

import java.util.List;

public interface BusinessHolidayRepository extends JpaRepository<BusinessHoliday, Long> {

    @Query("""
        SELECT h FROM BusinessHoliday h
        JOIN FETCH h.business
        LEFT JOIN FETCH h.service
        WHERE h.business.id = :businessId
        AND (h.service.id = :serviceId OR h.allServices = true)
        ORDER BY h.date ASC
    """)
    List<BusinessHoliday> findByBusinessIdAndServiceIdOrAllServices(
            @Param("businessId") Long businessId,
            @Param("serviceId") Long serviceId);

    @Query("""
        SELECT h FROM BusinessHoliday h
        JOIN FETCH h.business
        LEFT JOIN FETCH h.service
        WHERE (h.service.id = :serviceId OR
              (h.allServices = true AND h.business.id =
              (SELECT s.business.id FROM ServiceOffering s WHERE s.id = :serviceId)))
        ORDER BY h.date ASC
    """)
    List<BusinessHoliday> findByServiceIdOrBusinessWide(@Param("serviceId") Long serviceId);

    @Query("""
        SELECT h FROM BusinessHoliday h
        JOIN FETCH h.business
        LEFT JOIN FETCH h.service
        WHERE h.business.id = :businessId
        ORDER BY h.date ASC
    """)
    List<BusinessHoliday> findByBusinessIdOrderByDateAsc(@Param("businessId") Long businessId);

    boolean existsByBusinessIdAndServiceIdAndDate(Long businessId, Long serviceId, java.time.LocalDate date);
    boolean existsByBusinessIdAndAllServicesTrueAndDate(Long businessId, java.time.LocalDate date);

    @Transactional
    void deleteByServiceId(Long serviceId);

    void deleteByBusinessId(Long businessId);
}