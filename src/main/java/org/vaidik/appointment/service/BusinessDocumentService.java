package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.vaidik.appointment.dto.BusinessDocumentResponse;
import org.vaidik.appointment.entity.*;
import org.vaidik.appointment.repository.BusinessDocumentRepository;
import org.vaidik.appointment.repository.BusinessRepository;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BusinessDocumentService {

    private final BusinessDocumentRepository documentRepo;
    private final BusinessRepository businessRepo;

    @Value("${app.upload.dir:uploads/photos}")
    private String uploadDir;

    @Value("${app.document.dir:uploads/documents}")
    private String documentDir;

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

        // Validate file type — only PDF and images
        String contentType = file.getContentType();
        if (contentType == null ||
                (!contentType.equals("application/pdf") && !contentType.startsWith("image/"))) {
            throw new RuntimeException("Only PDF and image files are allowed");
        }

        // Save file
        Path dirPath = Paths.get(documentDir, String.valueOf(businessId));
        Files.createDirectories(dirPath);

        String ext = getExtension(file.getOriginalFilename());
        String filename = UUID.randomUUID() + "." + ext;
        Path filePath = dirPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Remove existing doc of same type (replace)
        DocumentType docType = DocumentType.valueOf(documentType);
        documentRepo.findByBusinessIdAndDocumentType(businessId, docType)
                .ifPresent(existing -> {
                    // Delete old file
                    try { Files.deleteIfExists(Paths.get(existing.getFilePath())); } catch (IOException ignored) {}
                    documentRepo.delete(existing);
                });

        BusinessDocument doc = BusinessDocument.builder()
                .business(business)
                .documentType(docType)
                .filePath(filePath.toString())
                .originalName(file.getOriginalFilename())
                .build();

        return toResponse(documentRepo.save(doc));
    }

    public void deleteDocument(Long documentId, String ownerEmail) {
        BusinessDocument doc = documentRepo.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        if (!doc.getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Not your document");
        }

        try { Files.deleteIfExists(Paths.get(doc.getFilePath())); } catch (IOException ignored) {}
        documentRepo.deleteById(documentId);
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "bin";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    private BusinessDocumentResponse toResponse(BusinessDocument doc) {
        String fileUrl = "/api/documents/" + doc.getId() + "/file";
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