package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.entity.Review;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    // Primary query — reviews for a specific service
    List<Review> findByServiceId(Long serviceId);

    // All reviews for every service belonging to a business
    // Used by the business-owner dashboard to show all their reviews in one place
    @Query("""
        SELECT DISTINCT r FROM Review r
        JOIN FETCH r.service s
        WHERE s.business.id = :businessId
        ORDER BY r.id DESC
    """)
    List<Review> findByBusinessId(@Param("businessId") Long businessId);

    boolean existsByAppointmentId(Long appointmentId);
    Optional<Review> findByAppointmentId(Long appointmentId);

    // Average rating for a specific service
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.service.id = :serviceId")
    Double getAverageRatingByServiceId(@Param("serviceId") Long serviceId);

    // Average rating across all services of a business
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.service.business.id = :businessId")
    Double getAverageRating(@Param("businessId") Long businessId);

    // Overall platform average (used by AdminService)
    @Query("SELECT AVG(r.rating) FROM Review r")
    Double getOverallAverageRating();
}