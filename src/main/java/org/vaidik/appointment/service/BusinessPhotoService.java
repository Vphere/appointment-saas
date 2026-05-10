package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.vaidik.appointment.dto.BusinessPhotoResponse;
import org.vaidik.appointment.entity.Business;
import org.vaidik.appointment.entity.BusinessPhoto;
import org.vaidik.appointment.entity.ServiceOffering;
import org.vaidik.appointment.repository.BusinessPhotoRepository;
import org.vaidik.appointment.repository.BusinessRepository;
import org.vaidik.appointment.repository.ServiceOfferingRepository;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BusinessPhotoService {

    private final BusinessPhotoRepository photoRepository;
    private final BusinessRepository businessRepository;
    private final ServiceOfferingRepository serviceRepository;

    @Value("${app.upload.dir:uploads/photos}")
    private String uploadDir;

    private static final int MAX_PHOTOS = 5;
    private static final List<String> ALLOWED_TYPES = List.of("image/jpeg","image/png","image/webp");

    public List<BusinessPhotoResponse> getPhotos(Long serviceId) {
        return photoRepository.findByServiceIdOrderByUploadedAtDesc(serviceId)
                .stream().map(this::toResponse).toList();
    }

    public BusinessPhotoResponse uploadPhoto(Long serviceId, MultipartFile file,
                                             String caption, String ownerEmail) throws IOException {
        ServiceOffering service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Service not found"));

        // Ownership check via service → business → owner
        if (!service.getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Unauthorized");
        }

        if (photoRepository.countByServiceId(serviceId) >= MAX_PHOTOS) {
            throw new RuntimeException("Maximum " + MAX_PHOTOS + " photos allowed per service.");
        }

        if (!ALLOWED_TYPES.contains(file.getContentType())) {
            throw new RuntimeException("Only JPEG, PNG, and WebP images are allowed.");
        }

        // Save file to disk
        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);

        String ext = getExtension(file.getOriginalFilename());
        String fileName = UUID.randomUUID() + ext;
        Path filePath = dir.resolve(fileName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        String url = "/uploads/photos/" + fileName;

        BusinessPhoto photo = BusinessPhoto.builder()
                .service(service)
                .fileName(fileName)
                .url(url)
                .caption(caption)
                .build();

        return toResponse(photoRepository.save(photo));
    }

    public void deletePhoto(Long photoId, String ownerEmail) throws IOException {
        BusinessPhoto photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new RuntimeException("Photo not found"));

        if (!photo.getService().getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Unauthorized");
        }

        // Delete from disk
        Path filePath = Paths.get(uploadDir).resolve(photo.getFileName());
        Files.deleteIfExists(filePath);

        photoRepository.delete(photo);
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return ".jpg";
        return filename.substring(filename.lastIndexOf("."));
    }

    private BusinessPhotoResponse toResponse(BusinessPhoto p) {
        return BusinessPhotoResponse.builder()
                .id(p.getId())
                .businessId(p.getService().getBusiness().getId())
                .serviceId(p.getService().getId())
                .url(p.getUrl())
                .caption(p.getCaption())
                .uploadedAt(p.getUploadedAt() != null ? p.getUploadedAt().toString() : null)
                .build();
    }
}