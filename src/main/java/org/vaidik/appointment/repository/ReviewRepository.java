package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.vaidik.appointment.entity.Review;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    @Query("""
        SELECT DISTINCT r FROM Review r
        JOIN FETCH r.user
        JOIN FETCH r.service s
        JOIN FETCH s.business
        LEFT JOIN FETCH r.appointment
        WHERE r.service.id = :serviceId
    """)
    List<Review> findByServiceId(@Param("serviceId") Long serviceId);

    @Query("""
        SELECT DISTINCT r FROM Review r
        JOIN FETCH r.user
        JOIN FETCH r.service s
        JOIN FETCH s.business
        LEFT JOIN FETCH r.appointment
        WHERE s.business.id = :businessId
        ORDER BY r.id DESC
    """)
    List<Review> findByBusinessId(@Param("businessId") Long businessId);

    @Query("""
        SELECT DISTINCT r FROM Review r
        JOIN FETCH r.user
        JOIN FETCH r.service s
        JOIN FETCH s.business
        LEFT JOIN FETCH r.appointment
        ORDER BY r.id DESC
    """)
    List<Review> findAllWithFetch();

    @Query("""
        SELECT r FROM Review r
        JOIN FETCH r.user
        JOIN FETCH r.service s
        JOIN FETCH s.business
        LEFT JOIN FETCH r.appointment
        WHERE r.id = :id
    """)
    Optional<Review> findByIdWithFetch(@Param("id") Long id);

    @Query("""
        SELECT r FROM Review r
        JOIN FETCH r.user
        JOIN FETCH r.service s
        JOIN FETCH s.business
        LEFT JOIN FETCH r.appointment
        WHERE r.appointment.id = :appointmentId
    """)
    Optional<Review> findByAppointmentId(@Param("appointmentId") Long appointmentId);

    boolean existsByAppointmentId(Long appointmentId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.service.id = :serviceId")
    Double getAverageRatingByServiceId(@Param("serviceId") Long serviceId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.service.business.id = :businessId")
    Double getAverageRating(@Param("businessId") Long businessId);

    @Query("SELECT AVG(r.rating) FROM Review r")
    Double getOverallAverageRating();
}