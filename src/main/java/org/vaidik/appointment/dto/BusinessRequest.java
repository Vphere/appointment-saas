package org.vaidik.appointment.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BusinessRequest {
    private String name;
    private String description;
    private String address;
    private String city;
    private String phone;
    private String category;
}