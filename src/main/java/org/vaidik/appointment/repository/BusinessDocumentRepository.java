package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.entity.BusinessDocument;
import org.vaidik.appointment.entity.DocumentType;

import java.util.List;
import java.util.Optional;

public interface BusinessDocumentRepository extends JpaRepository<BusinessDocument, Long> {
    List<BusinessDocument> findByBusinessId(Long businessId);
    Optional<BusinessDocument> findByBusinessIdAndDocumentType(Long businessId, DocumentType documentType);
    boolean existsByBusinessIdAndDocumentType(Long businessId, DocumentType documentType);
    @Transactional
    void deleteByBusinessId(Long businessId);
}