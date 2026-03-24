package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.SlotResponse;
import org.vaidik.appointment.service.SlotService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/slots")
@RequiredArgsConstructor
public class SlotController {

    private final SlotService slotService;

    @GetMapping
    public List<SlotResponse> getAvailableSlots(
            @RequestParam Long businessId,
            @RequestParam String date,
            @RequestParam int duration
    ) {

        return slotService.getAvailableSlots(
                businessId,
                LocalDate.parse(date),
                duration
        );
    }
}