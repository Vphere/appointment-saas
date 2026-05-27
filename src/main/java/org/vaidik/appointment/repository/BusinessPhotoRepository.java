package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.vaidik.appointment.entity.BusinessPhoto;

import java.util.List;

public interface BusinessPhotoRepository extends JpaRepository<BusinessPhoto, Long> {

    // Existing — used by BusinessPhotoService
    List<BusinessPhoto> findByServiceIdOrderByUploadedAtDesc(Long serviceId);

    // Existing — used by validation / limit checks
    long countByServiceId(Long serviceId);

    // Used by ServiceOfferingService.deleteService() — fetch file names BEFORE deleting rows
    @Query("SELECT p.fileName FROM BusinessPhoto p WHERE p.service.id = :serviceId")
    List<String> findFileNamesByServiceId(@Param("serviceId") Long serviceId);

    // Used by ServiceOfferingService.deleteService() — bulk-remove photo rows for a service
    @Modifying
    @Query("DELETE FROM BusinessPhoto p WHERE p.service.id = :serviceId")
    void deleteByServiceId(@Param("serviceId") Long serviceId);
}