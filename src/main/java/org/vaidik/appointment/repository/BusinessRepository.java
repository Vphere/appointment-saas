package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.vaidik.appointment.entity.Business;
import org.vaidik.appointment.entity.BusinessStatus;

import java.util.List;
import java.util.Optional;

public interface BusinessRepository extends JpaRepository<Business, Long> {

    @Query("SELECT b FROM Business b JOIN FETCH b.owner WHERE b.owner.id = :ownerId")
    List<Business> findByOwnerId(@Param("ownerId") Long ownerId);

    @Query("SELECT b FROM Business b JOIN FETCH b.owner WHERE b.owner.email = :email")
    List<Business> findByOwnerEmail(@Param("email") String email);

    @Query("SELECT b FROM Business b JOIN FETCH b.owner WHERE b.status = :status")
    List<Business> findByStatus(@Param("status") Enum status);

    long countByStatus(BusinessStatus status);

    @Query("SELECT b FROM Business b JOIN FETCH b.owner WHERE b.owner.email = :email AND b.deletedAt IS NULL")
    List<Business> findByOwnerEmailAndDeletedAtIsNull(@Param("email") String email);

    @Query("SELECT b FROM Business b JOIN FETCH b.owner WHERE b.status = :status AND b.deletedAt IS NULL")
    List<Business> findByStatusAndDeletedAtIsNull(@Param("status") BusinessStatus status);

    // Admin: active only
    @Query("SELECT b FROM Business b JOIN FETCH b.owner WHERE b.deletedAt IS NULL ORDER BY b.createdAt DESC")
    List<Business> findAllActive();

    // Admin: including deleted (for audit/analytics dashboard)
    @Query("SELECT b FROM Business b JOIN FETCH b.owner ORDER BY b.createdAt DESC")
    List<Business> findAllIncludingDeleted();

    // Active business by id (customers/owners should never see deleted)
    @Query("SELECT b FROM Business b JOIN FETCH b.owner WHERE b.id = :id AND b.deletedAt IS NULL")
    Optional<Business> findActiveById(@Param("id") Long id);

    @Query("SELECT b FROM Business b JOIN FETCH b.owner WHERE b.id = :id")
    Optional<Business> findById(@Param("id") Long id);
}
