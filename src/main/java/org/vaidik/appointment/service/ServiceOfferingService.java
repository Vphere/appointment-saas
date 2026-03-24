package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.CreateServiceRequest;
import org.vaidik.appointment.dto.ServiceResponse;
import org.vaidik.appointment.dto.UpdateServiceRequest;
import org.vaidik.appointment.entity.Business;
import org.vaidik.appointment.entity.BusinessStatus;
import org.vaidik.appointment.entity.ServiceOffering;
import org.vaidik.appointment.mapper.ServiceOfferingMapper;
import org.vaidik.appointment.repository.BusinessRepository;
import org.vaidik.appointment.repository.ServiceOfferingRepository;
import org.vaidik.appointment.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServiceOfferingService {

    private final ServiceOfferingRepository serviceRepository;
    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final ServiceOfferingMapper mapper;

    // CREATE SERVICE
    public ServiceResponse createService(CreateServiceRequest request, String userEmail) {

        Business business = businessRepository.findById(request.getBusinessId())
                .orElseThrow(() -> new RuntimeException("Business not found"));

        // 🔒 Ownership check
        if (!business.getOwner().getEmail().equals(userEmail)) {
            throw new RuntimeException("You are not owner of this business");
        }

        // 🔒 Business must be approved
        if (business.getStatus() != BusinessStatus.APPROVED) {
            throw new RuntimeException("Business is not approved yet");
        }

        ServiceOffering service = ServiceOffering.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .duration(request.getDuration())
                .business(business)
                .build();

        return mapper.toResponse(serviceRepository.save(service));
    }

    // GET SERVICES BY BUSINESS
    public List<ServiceResponse> getServicesByBusiness(Long businessId) {

        return serviceRepository.findByBusinessId(businessId)
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    // UPDATE SERVICE
    public ServiceResponse updateService(Long id, UpdateServiceRequest request, String userEmail) {

        ServiceOffering service = serviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Service not found"));

        // 🔒 Ownership check
        if (!service.getBusiness().getOwner().getEmail().equals(userEmail)) {
            throw new RuntimeException("Unauthorized");
        }

        service.setName(request.getName());
        service.setDescription(request.getDescription());
        service.setPrice(request.getPrice());
        service.setDuration(request.getDuration());

        return mapper.toResponse(serviceRepository.save(service));
    }

    // DELETE SERVICE
    public void deleteService(Long id, String userEmail) {

        ServiceOffering service = serviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Service not found"));

        // 🔒 Ownership check
        if (!service.getBusiness().getOwner().getEmail().equals(userEmail)) {
            throw new RuntimeException("Unauthorized");
        }

        serviceRepository.delete(service);
    }
}