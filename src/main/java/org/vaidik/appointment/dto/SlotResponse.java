package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalTime;

@Data
@Builder
public class SlotResponse {

    private LocalTime time;
}