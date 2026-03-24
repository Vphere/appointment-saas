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
                .address(business.getAddress())
                .city(business.getCity())
                .phone(business.getPhone())
                .build();
    }
}