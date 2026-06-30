package org.vaidik.appointment.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.vaidik.appointment.entity.Appointment;
import org.vaidik.appointment.entity.AppointmentStatus;
import org.vaidik.appointment.entity.PaymentStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByUserId(Long userId);

    @Query("""
        SELECT DISTINCT a FROM Appointment a
        JOIN FETCH a.user
        JOIN FETCH a.business
        JOIN FETCH a.service
        WHERE a.user.id = :userId ORDER BY a.createdAt DESC
    """)
    List<Appointment> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    List<Appointment> findByBusinessId(Long businessId);

    @Query("""
        SELECT DISTINCT a FROM Appointment a
        JOIN FETCH a.user
        JOIN FETCH a.business b
        JOIN FETCH a.service s
        WHERE b.id = :businessId
        ORDER BY a.createdAt DESC
    """)
    List<Appointment> findByBusinessIdWithJoinFetch(@Param("businessId") Long businessId);

    List<Appointment> findByBusinessIdAndStatusIn(Long businessId,
                                                  List<AppointmentStatus> statuses);

    boolean existsByServiceIdAndAppointmentDateAndAppointmentTime(
            Long serviceId, LocalDate date, LocalTime time
    );

    /**
     * How it works: when two requests arrive simultaneously both read the
     * same rows with a row-level exclusive lock. The second transaction blocks
     * until the first one commits, at which point it re-reads the now-committed
     * row and correctly detects the conflict.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
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

    @Query("""
        SELECT DISTINCT a FROM Appointment a
        JOIN FETCH a.user
        JOIN FETCH a.business
        JOIN FETCH a.service
        WHERE a.service.id = :serviceId AND a.appointmentDate = :date
    """)
    List<Appointment> findByServiceIdAndAppointmentDate(
            @Param("serviceId") Long serviceId,
            @Param("date") LocalDate date
    );

    long countByBusinessId(Long businessId);
    long countByBusinessIdAndStatus(Long businessId, AppointmentStatus status);
    long countByStatus(AppointmentStatus status);

    @Query("""
        SELECT DISTINCT a FROM Appointment a
        JOIN FETCH a.user
        JOIN FETCH a.business b
        JOIN FETCH a.service s
        WHERE b.owner.id = :ownerId
        ORDER BY a.createdAt DESC
    """)
    List<Appointment> findByOwnerIdWithJoinFetch(@Param("ownerId") Long ownerId);

    @Query("""
        SELECT DISTINCT a FROM Appointment a
        JOIN FETCH a.user
        JOIN FETCH a.business b
        JOIN FETCH b.owner
        JOIN FETCH a.service
        WHERE a.user.id = :userId AND a.status IN :statuses
        ORDER BY a.appointmentDate, a.appointmentTime
    """)
    List<Appointment> findByUserIdAndStatusInWithJoinFetch(
            @Param("userId") Long userId,
            @Param("statuses") List<AppointmentStatus> statuses
    );

    @Query("""
        SELECT DISTINCT a FROM Appointment a
        JOIN FETCH a.user
        JOIN FETCH a.business
        JOIN FETCH a.service
        WHERE a.reminderSent = false
        AND a.status IN :statuses
        AND FUNCTION('TIMESTAMP', a.appointmentDate, a.appointmentTime) >= :now
        AND FUNCTION('TIMESTAMP', a.appointmentDate, a.appointmentTime) <= :in24Hours
    """)
    List<Appointment> findAppointmentsDueForReminder(
            @Param("now") LocalDateTime now,
            @Param("in24Hours") LocalDateTime in24Hours,
            @Param("statuses") List<AppointmentStatus> statuses
    );

    @Query("""
        SELECT DISTINCT a FROM Appointment a
        JOIN FETCH a.user
        JOIN FETCH a.business
        JOIN FETCH a.service
        WHERE a.paymentStatus = :paymentStatus
        AND a.status = :appointmentStatus
        AND a.createdAt < :cutoff
    """)
    List<Appointment> findExpiredPendingPayments(
            @Param("paymentStatus") PaymentStatus paymentStatus,
            @Param("appointmentStatus") AppointmentStatus appointmentStatus,
            @Param("cutoff") LocalDateTime cutoff
    );

    /**
     * Finds appointments still in PENDING_PAYMENT state whose createdAt falls
     * within the nudge window [nudgeFrom, nudgeTo].
     */
    @Query("""
        SELECT DISTINCT a FROM Appointment a
        JOIN FETCH a.user
        JOIN FETCH a.business
        JOIN FETCH a.service
        WHERE a.paymentStatus = :paymentStatus
        AND a.status = :appointmentStatus
        AND a.depositNudgeSent = false
        AND a.createdAt BETWEEN :nudgeFrom AND :nudgeTo
    """)
    List<Appointment> findAppointmentsNeedingDepositNudge(
            @Param("paymentStatus") PaymentStatus paymentStatus,
            @Param("appointmentStatus") AppointmentStatus appointmentStatus,
            @Param("nudgeFrom") LocalDateTime nudgeFrom,
            @Param("nudgeTo") LocalDateTime nudgeTo
    );

    @Query(value = """
        SELECT a.service_id
        FROM appointments a
        WHERE a.status NOT IN ('CANCELLED')
        GROUP BY a.service_id
        ORDER BY COUNT(a.id) DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Long> findMostBookedServiceIds(@Param("limit") int limit);

}
