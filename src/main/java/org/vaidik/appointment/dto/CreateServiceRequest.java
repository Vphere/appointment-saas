package org.vaidik.appointment.dto;

import lombok.Data;
import org.vaidik.appointment.entity.ServiceCategory;

@Data
public class CreateServiceRequest {
    private String name;
    private String description;
    private Double price;
    private Integer duration;      // null for CONSULTATION
    private Integer gapMinutes;    // buffer between appointments
    private String serviceType;    // "FIXED" or "CONSULTATION"
    private Long businessId;
    private ServiceCategory category;

    private String address;
    private String city;
    private String state;
    private String country;
    private String pincode;

    private Long paymentAccountId;
}