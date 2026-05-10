package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.vaidik.appointment.entity.BusinessPhoto;

import java.util.List;

public interface BusinessPhotoRepository extends JpaRepository<BusinessPhoto, Long> {
    List<BusinessPhoto> findByServiceIdOrderByUploadedAtDesc(Long serviceId);
    long countByServiceId(Long serviceId);
}