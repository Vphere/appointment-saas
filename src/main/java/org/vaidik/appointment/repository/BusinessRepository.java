package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.vaidik.appointment.entity.Business;
import org.vaidik.appointment.entity.BusinessStatus;

import java.util.List;
import java.util.Optional;

public interface BusinessRepository extends JpaRepository<Business, Long> {

    List<Business> findByOwnerId(Long ownerId);
    List<Business> findByOwnerEmail(String email);
    List<Business> findByStatus(Enum status);
    long countByStatus(BusinessStatus status);

    List<Business> findByOwnerEmailAndDeletedAtIsNull(String email);
    List<Business> findByStatusAndDeletedAtIsNull(BusinessStatus status);

    // Admin: active only
    @Query("SELECT b FROM Business b WHERE b.deletedAt IS NULL ORDER BY b.createdAt DESC")
    List<Business> findAllActive();

    // Admin: including deleted (for audit/analytics dashboard)
    @Query("SELECT b FROM Business b ORDER BY b.createdAt DESC")
    List<Business> findAllIncludingDeleted();

    // Active business by id (customers/owners should never see deleted)
    @Query("SELECT b FROM Business b WHERE b.id = :id AND b.deletedAt IS NULL")
    Optional<Business> findActiveById(@Param("id") Long id);


}