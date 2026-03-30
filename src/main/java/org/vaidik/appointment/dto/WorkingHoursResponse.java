package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WorkingHoursResponse {

    private Long id;
    private String dayOfWeek;
    private String startTime;
    private String endTime;
    private boolean open;
    private Long serviceId;
}