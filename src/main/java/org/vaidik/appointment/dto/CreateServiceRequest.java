package org.vaidik.appointment.dto;

import lombok.Data;

@Data
public class CreateServiceRequest {
    private String name;
    private String description;
    private Double price;
    private Integer duration;
    private Long businessId;
}
