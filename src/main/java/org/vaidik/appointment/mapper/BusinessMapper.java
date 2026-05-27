package org.vaidik.appointment.mapper;

import org.springframework.stereotype.Component;
import org.vaidik.appointment.dto.BusinessResponse;
import org.vaidik.appointment.entity.Business;

@Component
public class BusinessMapper {

    public BusinessResponse toResponse(Business business) {

        return BusinessResponse.builder()
                .id(business.getId())
                .name(business.getName())
                .description(business.getDescription())
                .status( business.getStatus().name())
                .phone(business.getPhone())
                .businessType( business.getBusinessType() != null ? business.getBusinessType().name() : null )
                .panNumber(business.getPanNumber())
                .annualTurnover(business.getAnnualTurnover())
                .gstNumber(business.getGstNumber())
                .udyamNumber(business.getUdyamNumber())
                .gstRequired(business.isGstRequired())
                .ownerName( business.getOwner().getName() )
                .ownerEmail( business.getOwner().getEmail())
                .createdAt(business.getCreatedAt())
                .build();
    }
}