package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.vaidik.appointment.entity.Review;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByBusinessId(Long businessId);
    boolean existsByAppointmentId(Long appointmentId);
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.business.id = :businessId")
    Double getAverageRating(@Param("businessId")Long businessId);
    Optional<Review> findByAppointmentId(Long appointmentId);
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.appointment.service.id = :serviceId")
    Double getAverageRatingByServiceId(@Param("serviceId") Long serviceId);
}