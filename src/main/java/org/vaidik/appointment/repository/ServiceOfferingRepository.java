package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.vaidik.appointment.entity.ServiceCategory;
import org.vaidik.appointment.entity.ServiceOffering;

import java.util.List;
import java.util.Optional;

public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, Long> {

    @Query("SELECT s FROM ServiceOffering s WHERE s.business.id = :businessId AND s.deletedAt IS NULL")
    List<ServiceOffering> findByBusinessIdAndDeletedFalse(@Param("businessId") Long businessId);

    @Query("SELECT s FROM ServiceOffering s WHERE s.deletedAt IS NULL")
    List<ServiceOffering> findByDeletedFalse();

    @Query("SELECT s FROM ServiceOffering s WHERE s.id = :id AND s.deletedAt IS NULL")
    Optional<ServiceOffering> findByIdAndDeletedFalse(@Param("id") Long id);

    @Query("SELECT s FROM ServiceOffering s WHERE s.category = :category AND s.deletedAt IS NULL")
    List<ServiceOffering> findByCategoryAndDeletedFalse(@Param("category") ServiceCategory category);

    @Query("SELECT s FROM ServiceOffering s WHERE s.category = :category AND s.city = :city AND s.deletedAt IS NULL")
    List<ServiceOffering> findByCategoryAndCityAndDeletedFalse( @Param("category") ServiceCategory category,
                                                                @Param("city") String city);

    // Used by AdminService / analytics: counts ALL services ever created for a business
    long countByBusinessId(Long businessId);

    // Returns all service rows for a business (including soft-deleted) — for FK-safe
    // joins such as appointment history where the service row must still exist.
    List<ServiceOffering> findByBusinessId(Long businessId);

}