package org.vaidik.appointment.mapper;

import org.springframework.stereotype.Component;
import org.vaidik.appointment.dto.ServiceResponse;
import org.vaidik.appointment.entity.ServiceOffering;

@Component
public class ServiceOfferingMapper {
    public ServiceResponse toResponse(ServiceOffering service) {

        return ServiceResponse.builder()
                .id(service.getId())
                .name(service.getName())
                .description(service.getDescription())
                .price(service.getPrice())
                .duration(service.getDuration())
                .category(service.getCategory())
                .gapMinutes(service.getGapMinutes() != null ? service.getGapMinutes() : 0)
                .serviceType(service.getServiceType() != null ? service.getServiceType().name() : "FIXED")
                .businessId(service.getBusiness().getId())
                .businessName(service.getBusiness().getName())
                .address(service.getAddress())
                .city(service.getCity())
                .state(service.getState())
                .country(service.getCountry())
                .pincode(service.getPincode())
                .build();
    }
}
