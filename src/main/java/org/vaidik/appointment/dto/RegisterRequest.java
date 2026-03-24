package org.vaidik.appointment.dto;

import lombok.Getter;
import lombok.Setter;
import org.vaidik.appointment.entity.Role;

@Getter
@Setter
public class RegisterRequest {
    private String name;
    private String email;
    private String password;
    private Role role;
}