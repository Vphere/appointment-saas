package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.CreateServiceRequest;
import org.vaidik.appointment.dto.ServiceResponse;
import org.vaidik.appointment.dto.UpdateServiceRequest;
import org.vaidik.appointment.service.ServiceOfferingService;

import java.util.List;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class ServiceOfferingController {

    private final ServiceOfferingService serviceOfferingService;

    // CREATE SERVICE
    @PostMapping
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public ServiceResponse createService(@RequestBody CreateServiceRequest request, Authentication authentication) {

        return serviceOfferingService.createService(
                request,
                authentication.getName()
        );
    }

    // GET SERVICES (PUBLIC)
    @GetMapping("/business/{businessId}")
    public List<ServiceResponse> getServices(@PathVariable Long businessId) {
        return serviceOfferingService.getServicesByBusiness(businessId);
    }

    // UPDATE SERVICE
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public ServiceResponse updateService(@PathVariable Long id, @RequestBody UpdateServiceRequest request, Authentication authentication) {

        return serviceOfferingService.updateService(
                id,
                request,
                authentication.getName()
        );
    }

    // DELETE SERVICE
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public void deleteService(@PathVariable Long id, Authentication authentication) {

        serviceOfferingService.deleteService(id, authentication.getName());
    }

    @GetMapping
    public List<ServiceResponse> getAllServices() {
        return serviceOfferingService.getAllServices();
    }
}