package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.vaidik.appointment.entity.Payment;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByAppointmentId(Long appointmentId);
    Optional<Payment> findByRazorpayOrderId(String orderId);

    @Modifying
    @Query("DELETE FROM Payment p WHERE p.appointment.id = :appointmentId")
    void deleteByAppointmentIdDirect(@Param("appointmentId") Long appointmentId);
}