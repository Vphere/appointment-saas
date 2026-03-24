package org.vaidik.appointment.dto;

import lombok.Data;

@Data
public class UpdateServiceRequest {

    private String name;
    private String description;
    private Double price;
    private Integer duration;
}