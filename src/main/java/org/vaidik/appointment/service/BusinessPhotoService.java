package org.vaidik.appointment.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.vaidik.appointment.dto.BusinessPhotoResponse;
import org.vaidik.appointment.entity.BusinessPhoto;
import org.vaidik.appointment.entity.ServiceOffering;
import org.vaidik.appointment.repository.BusinessPhotoRepository;
import org.vaidik.appointment.repository.ServiceOfferingRepository;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BusinessPhotoService {

    private final BusinessPhotoRepository photoRepository;
    private final ServiceOfferingRepository serviceRepository;
    private final Cloudinary cloudinary;

    private static final int MAX_PHOTOS = 5;
    private static final List<String> ALLOWED_TYPES =
            List.of("image/jpeg", "image/png", "image/webp");

    public List<BusinessPhotoResponse> getPhotos(Long serviceId) {
        return photoRepository.findByServiceIdOrderByUploadedAtDesc(serviceId)
                .stream().map(this::toResponse).toList();
    }

    public BusinessPhotoResponse uploadPhoto(Long serviceId, MultipartFile file,
                                             String caption, String ownerEmail) throws IOException {
        ServiceOffering service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new RuntimeException("Service not found"));

        if (!service.getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Unauthorized");
        }

        if (photoRepository.countByServiceId(serviceId) >= MAX_PHOTOS) {
            throw new RuntimeException("Maximum " + MAX_PHOTOS + " photos allowed per service.");
        }

        if (!ALLOWED_TYPES.contains(file.getContentType())) {
            throw new RuntimeException("Only JPEG, PNG, and WebP images are allowed.");
        }

        // Upload to Cloudinary
        Map uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", "bookease/photos/" + serviceId,
                        "resource_type", "image"
                )
        );

        String photoUrl = (String) uploadResult.get("secure_url");
        String publicId = (String) uploadResult.get("public_id");

        BusinessPhoto photo = BusinessPhoto.builder()
                .service(service)
                .fileName(publicId)   // store publicId as fileName for compatibility
                .url(photoUrl)
                .caption(caption)
                .publicId(publicId)
                .build();

        return toResponse(photoRepository.save(photo));
    }

    public void deletePhoto(Long photoId, String ownerEmail) throws IOException {
        BusinessPhoto photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new RuntimeException("Photo not found"));

        if (!photo.getService().getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Unauthorized");
        }

        // Delete from Cloudinary
        if (photo.getPublicId() != null) {
            cloudinary.uploader().destroy(photo.getPublicId(), ObjectUtils.emptyMap());
        }

        photoRepository.delete(photo);
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