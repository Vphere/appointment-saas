package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.vaidik.appointment.dto.BusinessPhotoResponse;
import org.vaidik.appointment.service.BusinessPhotoService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/photos")
@RequiredArgsConstructor
public class BusinessPhotoController {

    private final BusinessPhotoService photoService;

    @GetMapping("/service/{serviceId}")
    public List<BusinessPhotoResponse> getPhotos(@PathVariable("serviceId") Long serviceId) {
        return photoService.getPhotos(serviceId);
    }

    @PostMapping("/service/{serviceId}")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public BusinessPhotoResponse uploadPhoto(
            @PathVariable("serviceId") Long serviceId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption,
            Authentication authentication) throws Exception {
        return photoService.uploadPhoto(serviceId, file, caption, authentication.getName());
    }

    @DeleteMapping("/{photoId}")
    @PreAuthorize("hasRole('BUSINESS_OWNER')")
    public ResponseEntity<Map<String, String>> deletePhoto(
            @PathVariable("photoId") Long photoId,
            Authentication authentication) throws Exception {
        photoService.deletePhoto(photoId, authentication.getName());
        return ResponseEntity.ok(Map.of("message", "Photo deleted"));
    }
}