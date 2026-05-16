package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.vaidik.appointment.entity.Business;
import org.vaidik.appointment.entity.BusinessStatus;

import java.util.List;

public interface BusinessRepository extends JpaRepository<Business, Long> {
    List<Business> findByOwnerId(Long ownerId);
    List<Business> findByOwnerEmail(String email);
    List<Business> findByStatus(Enum status);
    long countByStatus(BusinessStatus status);
}