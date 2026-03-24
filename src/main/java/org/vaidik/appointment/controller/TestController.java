package org.vaidik.appointment.controller;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/test")
public class TestController {

    @GetMapping("/secure")
    public String secureEndpoint() {
        return "You are authenticated!";
    }
}