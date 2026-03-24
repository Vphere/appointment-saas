package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ServiceResponse {
    private Long id;
    private String name;
    private String description;
    private Double price;
    private Integer duration;
    private Long businessId;
}
