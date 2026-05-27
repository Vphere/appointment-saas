package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class BusinessDocumentResponse {
    private Long id;
    private Long businessId;
    private String documentType;
    private String originalName;
    private String fileUrl;        // URL to access the file
    private LocalDateTime uploadedAt;
}