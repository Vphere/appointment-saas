package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.vaidik.appointment.entity.Appointment;
import org.vaidik.appointment.entity.AppointmentStatus;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByUserId(Long userId);

    List<Appointment> findByBusinessId(Long businessId);

    boolean existsByServiceIdAndAppointmentDateAndAppointmentTime(
            Long serviceId,
            LocalDate date,
            LocalTime time
    );

    List<Appointment> findByServiceIdAndAppointmentDate(
            Long serviceId,
            LocalDate appointmentDate
    );

    long countByBusinessId(Long businessId);

    long countByBusinessIdAndStatus(Long businessId, AppointmentStatus status);
}