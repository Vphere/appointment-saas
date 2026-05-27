package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Data;
import org.vaidik.appointment.entity.ServiceCategory;

@Data
@Builder
public class ServiceResponse {
    private Long id;
    private String name;
    private String description;
    private Double price;
    private Integer duration;
    private Integer gapMinutes;
    private String serviceType;    // "FIXED" or "CONSULTATION"
    private Long businessId;
    private String businessName;
    private ServiceCategory category;

    // Location
    private String address;
    private String city;
    private String state;
    private String country;
    private String pincode;
}