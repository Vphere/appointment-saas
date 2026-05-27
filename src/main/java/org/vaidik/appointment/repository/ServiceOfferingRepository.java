package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.vaidik.appointment.entity.ServiceCategory;
import org.vaidik.appointment.entity.ServiceOffering;

import java.util.List;
import java.util.Optional;

public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, Long> {

    // Used by ServiceOfferingService.getServicesByBusiness()
    List<ServiceOffering> findByBusinessIdAndDeletedFalse(Long businessId);

    // Used by ServiceOfferingService.getAllServices()
    List<ServiceOffering> findByDeletedFalse();

    // Used by ServiceOfferingService.updateService() and deleteService()
    Optional<ServiceOffering> findByIdAndDeletedFalse(Long id);

    // Kept from original — used by AdminService / analytics
    long countByBusinessId(Long businessId);

    List<ServiceOffering> findByCategoryAndDeletedFalse(ServiceCategory category);

    List<ServiceOffering> findByCategoryAndCityAndDeletedFalse(ServiceCategory category, String city);
}