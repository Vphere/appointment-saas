package org.vaidik.appointment.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileDTO {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String address;
    private String role;
    private String provider;

    // Soft-delete fields — used by admin UI
    private boolean deleted;
    private LocalDateTime deletedAt;
    private String deletionReason;
}