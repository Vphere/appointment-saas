package org.vaidik.appointment.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class BusinessResponse {
    private Long id;
    private String name;
    private String description;
    private String status;
    private String phone;
    private String businessType;
    private String panNumber;
    private Long annualTurnover;
    private String gstNumber;
    private String udyamNumber;
    private boolean gstRequired;
    private String ownerName;
    private String ownerEmail;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}