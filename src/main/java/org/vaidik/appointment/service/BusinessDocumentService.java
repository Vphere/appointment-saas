package org.vaidik.appointment.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.vaidik.appointment.dto.BusinessDocumentResponse;
import org.vaidik.appointment.entity.*;
import org.vaidik.appointment.repository.BusinessDocumentRepository;
import org.vaidik.appointment.repository.BusinessRepository;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BusinessDocumentService {

    private final BusinessDocumentRepository documentRepo;
    private final BusinessRepository businessRepo;
    private final Cloudinary cloudinary;

    public List<BusinessDocumentResponse> getDocuments(Long businessId) {
        return documentRepo.findByBusinessId(businessId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public BusinessDocumentResponse uploadDocument(Long businessId,
                                                   String documentType,
                                                   MultipartFile file,
                                                   String ownerEmail) throws IOException {
        Business business = businessRepo.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Business not found"));

        if (!business.getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Not your business");
        }

        String contentType = file.getContentType();
        if (contentType == null ||
                (!contentType.equals("application/pdf") && !contentType.startsWith("image/"))) {
            throw new RuntimeException("Only PDF and image files are allowed");
        }

        DocumentType docType = DocumentType.valueOf(documentType);

        // Delete existing doc of same type from Cloudinary first
        documentRepo.findByBusinessIdAndDocumentType(businessId, docType)
                .ifPresent(existing -> {
                    if (existing.getCloudinaryPublicId() != null) {
                        try {
                            // For PDFs resource_type is "raw", for images it's "image"
                            String resourceType = existing.getOriginalName() != null
                                    && existing.getOriginalName().endsWith(".pdf")
                                    ? "raw" : "image";
                            cloudinary.uploader().destroy(
                                    existing.getCloudinaryPublicId(),
                                    ObjectUtils.asMap("resource_type", resourceType)
                            );
                        } catch (Exception ignored) {}
                    }
                    documentRepo.delete(existing);
                });

        // Upload to Cloudinary
        String resourceType = contentType.equals("application/pdf") ? "raw" : "image";
        Map uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", "bookease/documents/" + businessId,
                        "resource_type", resourceType,
                        "public_id", docType.name().toLowerCase() + "_" + businessId
                )
        );

        String cloudinaryUrl = (String) uploadResult.get("secure_url");
        String publicId = (String) uploadResult.get("public_id");

        BusinessDocument doc = BusinessDocument.builder()
                .business(business)
                .documentType(docType)
                .filePath(cloudinaryUrl)   // store URL in filePath for backward compat
                .originalName(file.getOriginalFilename())
                .cloudinaryPublicId(publicId)
                .cloudinaryUrl(cloudinaryUrl)
                .build();

        return toResponse(documentRepo.save(doc));
    }

    public void deleteDocument(Long documentId, String ownerEmail) throws IOException {
        BusinessDocument doc = documentRepo.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        if (!doc.getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Not your document");
        }

        if (doc.getCloudinaryPublicId() != null) {
            try {
                String resourceType = doc.getOriginalName() != null
                        && doc.getOriginalName().endsWith(".pdf") ? "raw" : "image";
                cloudinary.uploader().destroy(
                        doc.getCloudinaryPublicId(),
                        ObjectUtils.asMap("resource_type", resourceType)
                );
            } catch (Exception ignored) {}
        }

        documentRepo.deleteById(documentId);
    }

    private BusinessDocumentResponse toResponse(BusinessDocument doc) {
        // Use Cloudinary URL directly if available, else fallback to API endpoint
        String fileUrl = doc.getCloudinaryUrl() != null
                ? doc.getCloudinaryUrl()
                : "/api/documents/" + doc.getId() + "/file";

        return BusinessDocumentResponse.builder()
                .id(doc.getId())
                .businessId(doc.getBusiness().getId())
                .documentType(doc.getDocumentType().name())
                .originalName(doc.getOriginalName())
                .fileUrl(fileUrl)
                .uploadedAt(doc.getUploadedAt())
                .build();
    }
}