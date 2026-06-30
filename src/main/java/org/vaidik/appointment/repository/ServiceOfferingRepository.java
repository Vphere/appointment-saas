package org.vaidik.appointment.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.vaidik.appointment.entity.ServiceCategory;
import org.vaidik.appointment.entity.ServiceOffering;

import java.util.List;
import java.util.Optional;

public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, Long> {

    @Query("SELECT s FROM ServiceOffering s JOIN FETCH s.business WHERE s.business.id = :businessId AND s.deletedAt IS NULL")
    List<ServiceOffering> findByBusinessIdAndDeletedFalse(@Param("businessId") Long businessId);

    @Query("SELECT s FROM ServiceOffering s JOIN FETCH s.business b WHERE s.deletedAt IS NULL AND b.deletedAt IS NULL AND b.status = org.vaidik.appointment.entity.BusinessStatus.APPROVED")
    List<ServiceOffering> findByDeletedFalse();

    @Query("SELECT s FROM ServiceOffering s JOIN FETCH s.business WHERE s.id = :id AND s.deletedAt IS NULL")
    Optional<ServiceOffering> findByIdAndDeletedFalse(@Param("id") Long id);

    @Query("SELECT s FROM ServiceOffering s JOIN FETCH s.business WHERE s.id = :id")
    Optional<ServiceOffering> findByIdWithFetch(@Param("id") Long id);

    @Query("SELECT s FROM ServiceOffering s JOIN FETCH s.business b WHERE s.category = :category AND s.deletedAt IS NULL AND b.deletedAt IS NULL AND b.status = org.vaidik.appointment.entity.BusinessStatus.APPROVED")
    List<ServiceOffering> findByCategoryAndDeletedFalse(@Param("category") ServiceCategory category);

    @Query("SELECT s FROM ServiceOffering s JOIN FETCH s.business b WHERE s.category = :category AND s.city = :city AND s.deletedAt IS NULL AND b.deletedAt IS NULL AND b.status = org.vaidik.appointment.entity.BusinessStatus.APPROVED")
    List<ServiceOffering> findByCategoryAndCityAndDeletedFalse(@Param("category") ServiceCategory category,
                                                               @Param("city") String city);

    long countByBusinessId(Long businessId);

    List<ServiceOffering> findByBusinessId(Long businessId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM ServiceOffering s WHERE s.id = :id")
    Optional<ServiceOffering> findByIdForUpdate(@Param("id") Long id);
}