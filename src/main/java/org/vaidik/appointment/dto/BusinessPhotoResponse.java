package org.vaidik.appointment.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class BusinessPhotoResponse {
    private Long id;
    private Long businessId;
    private Long serviceId;
    private String url;
    private String caption;
    private String uploadedAt;
}