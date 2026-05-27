package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.vaidik.appointment.dto.BusinessDocumentResponse;
import org.vaidik.appointment.entity.BusinessDocument;
import org.vaidik.appointment.repository.BusinessDocumentRepository;
import org.vaidik.appointment.service.BusinessDocumentService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class BusinessDocumentController {

    private final BusinessDocumentService documentService;
    private final BusinessDocumentRepository documentRepo;

    // Owner: get their business documents
    @GetMapping("/business/{businessId}")
    public ResponseEntity<List<BusinessDocumentResponse>> getDocuments(
            @PathVariable("businessId") Long businessId) {
        return ResponseEntity.ok(documentService.getDocuments(businessId));
    }

    // Owner: upload document
    @PostMapping("/business/{businessId}/upload")
    public ResponseEntity<BusinessDocumentResponse> uploadDocument(
            @PathVariable("businessId") Long businessId,
            @RequestParam("documentType") String documentType,
            @RequestParam("file") MultipartFile file,
            Authentication auth) throws IOException {
        return ResponseEntity.ok(
                documentService.uploadDocument(businessId, documentType, file, auth.getName())
        );
    }

    // Admin + Owner: serve file for viewing
    @GetMapping("/{documentId}/file")
    public ResponseEntity<Resource> serveFile(@PathVariable("documentId") Long documentId) throws IOException {
        BusinessDocument doc = documentRepo.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        java.nio.file.Path path = Paths.get(doc.getFilePath());
        if (!Files.exists(path)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(path);
        String contentType = Files.probeContentType(path);
        if (contentType == null) contentType = "application/octet-stream";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + doc.getOriginalName() + "\"")
                .body(resource);
    }

    // Owner: delete document
    @DeleteMapping("/{documentId}")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable("documentId") Long documentId,
            Authentication auth) {
        documentService.deleteDocument(documentId, auth.getName());
        return ResponseEntity.noContent().build();
    }
}