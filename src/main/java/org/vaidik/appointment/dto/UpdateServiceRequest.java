package org.vaidik.appointment.dto;

import lombok.Data;
import org.vaidik.appointment.entity.ServiceCategory;

@Data
public class UpdateServiceRequest {

    private String name;
    private String description;
    private Double price;
    private Integer duration;
    private Integer gapMinutes;
    private String serviceType;
    private ServiceCategory category;

    // Location fields
    private String address;
    private String city;
    private String state;
    private String country;
    private String pincode;
}