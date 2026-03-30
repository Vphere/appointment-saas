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
    private String address;
    private String city;
    private String phone;
    private String category;
    private String ownerName;
    private String ownerEmail;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
