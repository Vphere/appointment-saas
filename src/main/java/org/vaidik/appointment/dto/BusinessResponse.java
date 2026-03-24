package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class BusinessResponse {
    private Long id;
    private String name;
    private String description;
    private String status;
    private String address;

    private String city;

    private String phone;
}
