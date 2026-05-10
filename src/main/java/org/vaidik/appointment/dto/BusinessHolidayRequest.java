package org.vaidik.appointment.dto;

import lombok.*;
import java.time.LocalDate;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class BusinessHolidayRequest {
    private Long businessId;
    private Long serviceId;
    private boolean allServices;
    private LocalDate date;
    private String reason;
}