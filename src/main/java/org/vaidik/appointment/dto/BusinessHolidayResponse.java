package org.vaidik.appointment.dto;

import lombok.*;
import java.time.LocalDate;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class BusinessHolidayResponse {
    private Long id;
    private Long businessId;
    private Long serviceId;
    private boolean allServices;
    private LocalDate date;
    private String reason;
    private String serviceName;
}