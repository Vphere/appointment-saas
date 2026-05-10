package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.vaidik.appointment.entity.BusinessHoliday;

import java.util.List;

public interface BusinessHolidayRepository extends JpaRepository<BusinessHoliday, Long> {
    // Get holidays for a specific service OR business-wide holidays
    @Query("SELECT h FROM BusinessHoliday h WHERE h.business.id = :businessId " +
            "AND (h.service.id = :serviceId OR h.allServices = true) " +
            "ORDER BY h.date ASC")
    List<BusinessHoliday> findByBusinessIdAndServiceIdOrAllServices(
            @Param("businessId") Long businessId,
            @Param("serviceId") Long serviceId);

    @Query("SELECT h FROM BusinessHoliday h WHERE " +
            "(h.service.id = :serviceId OR " +
            "(h.allServices = true AND h.business.id = " +
            "  (SELECT s.business.id FROM ServiceOffering s WHERE s.id = :serviceId))) " +
            "ORDER BY h.date ASC")
    List<BusinessHoliday> findByServiceIdOrBusinessWide(@Param("serviceId") Long serviceId);

    // Get all holidays for a business (owner view)
    List<BusinessHoliday> findByBusinessIdOrderByDateAsc(Long businessId);

    // Check duplicate
    boolean existsByBusinessIdAndServiceIdAndDate(Long businessId, Long serviceId, java.time.LocalDate date);
    boolean existsByBusinessIdAndAllServicesTrueAndDate(Long businessId, java.time.LocalDate date);
}