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
                .businessId(service.getBusiness().getId())
                .build();
    }
}
