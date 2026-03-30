package org.vaidik.appointment.dto;

import lombok.Data;
import java.time.DayOfWeek;
import java.util.List;

@Data
public class WorkingHoursBulkRequest {

    private Long serviceId;
    private List<DayOfWeek> days;
    private String startTime; // "09:00"
    private String endTime;   // "18:00"
    private boolean open;
}