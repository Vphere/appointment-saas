package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.entity.Appointment;
import org.vaidik.appointment.entity.AppointmentStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByUserId(Long userId);
    @Query("SELECT a FROM Appointment a WHERE a.user.id = :userId ORDER BY a.createdAt DESC")
    List<Appointment> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    List<Appointment> findByBusinessId(Long businessId);

    List<Appointment> findByBusinessIdAndStatusIn(Long businessId,
                                                  List<AppointmentStatus> statuses);

    boolean existsByServiceIdAndAppointmentDateAndAppointmentTime(
            Long serviceId,
            LocalDate date,
            LocalTime time
    );

    @Query("SELECT COUNT(a) > 0 FROM Appointment a " +
            "WHERE a.service.id = :serviceId " +
            "AND a.appointmentDate = :date " +
            "AND a.appointmentTime = :time " +
            "AND a.status NOT IN :excludedStatuses")
    boolean existsActiveByServiceDateAndTime(
            @Param("serviceId") Long serviceId,
            @Param("date") LocalDate date,
            @Param("time") LocalTime time,
            @Param("excludedStatuses") List<AppointmentStatus> excludedStatuses
    );

    List<Appointment> findByServiceIdAndAppointmentDate(
            Long serviceId,
            LocalDate appointmentDate
    );

    long countByBusinessId(Long businessId);

    long countByBusinessIdAndStatus(Long businessId, AppointmentStatus status);
    long countByStatus(AppointmentStatus status);

    /**
     * Finds all CONFIRMED (or PENDING) appointments scheduled for tomorrow.
     * Used by the reminder scheduler to send 24-hour reminder emails.
     * Finds appointments whose datetime falls within the next 24 hours,
     * haven't had a reminder sent yet, and are in an active status.
     * CONCAT(date, ' ', time) builds a datetime string for comparison.
     * :now and :in24Hours are LocalDateTime parameters passed by the scheduler.
     */

//    @Query("SELECT a FROM Appointment a " +
//            "JOIN FETCH a.user " +
//            "JOIN FETCH a.business b " +
//            "JOIN FETCH b.owner " +
//            "JOIN FETCH a.service " +
//            "WHERE a.reminderSent = false " +
//            "AND a.status IN :statuses " +
//            "AND CAST(CONCAT(CAST(a.appointmentDate AS string), ' ', CAST(a.appointmentTime AS string)) AS java.time.LocalDateTime) " +
//            "    BETWEEN :now AND :in24Hours")
//    List<Appointment> findAppointmentsDueForReminder(
//            @Param("now") LocalDateTime now,
//            @Param("in24Hours") LocalDateTime in24Hours,
//            @Param("statuses") List<AppointmentStatus> statuses
//    );

    @Query(value = """
        SELECT * FROM appointments a
        WHERE a.reminder_sent = false
        AND a.status IN (:statuses)
        AND TIMESTAMP(a.appointment_date, a.appointment_time) BETWEEN :now AND :in24Hours
        """, nativeQuery = true)
    List<Appointment> findAppointmentsDueForReminder(
            @Param("now") LocalDateTime now,
            @Param("in24Hours") LocalDateTime in24Hours,
            @Param("statuses") List<String> statuses
    );
}