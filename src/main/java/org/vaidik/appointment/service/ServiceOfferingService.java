package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.dto.CreateServiceRequest;
import org.vaidik.appointment.dto.ServiceResponse;
import org.vaidik.appointment.dto.UpdateServiceRequest;
import org.vaidik.appointment.entity.*;
import org.vaidik.appointment.mapper.ServiceOfferingMapper;
import org.vaidik.appointment.repository.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceOfferingService {

    private final ServiceOfferingRepository serviceRepository;
    private final BusinessRepository        businessRepository;
    private final UserRepository            userRepository;
    private final ServiceOfferingMapper     mapper;
    private final BusinessHolidayRepository businessHolidayRepository;
    private final WorkingHoursRepository    workingHoursRepository;
    private final BusinessPhotoRepository   businessPhotoRepository;

    // Configured in application.properties: app.upload.dir=uploads
    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    // ── CREATE ───────────────────────────────────────────────────────
    @Transactional
    public ServiceResponse createService(CreateServiceRequest request, String userEmail) {

        Business business = businessRepository.findById(request.getBusinessId())
                .orElseThrow(() -> new RuntimeException("Business not found"));

        if (!business.getOwner().getEmail().equals(userEmail))
            throw new RuntimeException("You are not owner of this business");

        if (business.getStatus() != BusinessStatus.APPROVED)
            throw new RuntimeException("Business is not approved yet");

        ServiceType serviceType = request.getServiceType() != null
                ? ServiceType.valueOf(request.getServiceType())
                : ServiceType.FIXED;

        int gap = request.getGapMinutes() != null ? request.getGapMinutes() : 0;

        if (serviceType == ServiceType.CONSULTATION && gap <= 0)
            throw new RuntimeException(
                    "Gap Between Appointments must be at least 1 minute for Consultation services.");

        ServiceOffering service = ServiceOffering.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .duration(request.getDuration())
                .category(request.getCategory())
                .gapMinutes(gap)
                .serviceType(serviceType)
                .business(business)
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .country(request.getCountry())
                .pincode(request.getPincode())
                .deleted(false)
                .build();

        return mapper.toResponse(serviceRepository.save(service));
    }

    // ── BULK CREATE ──────────────────────────────────────────────────
    @Transactional
    public List<ServiceResponse> createServicesBulk(List<CreateServiceRequest> requests, String userEmail) {
        return requests.stream()
                .map(req -> createService(req, userEmail))
                .toList();
    }

    // ── GET BY BUSINESS (active only) ────────────────────────────────
    public List<ServiceResponse> getServicesByBusiness(Long businessId) {
        return serviceRepository.findByBusinessIdAndDeletedFalse(businessId)
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    public List<ServiceResponse> getByCategory(ServiceCategory category, String city) {
        List<ServiceOffering> services = (city != null && !city.isBlank())
                ? serviceRepository.findByCategoryAndCityAndDeletedFalse(category, city)
                : serviceRepository.findByCategoryAndDeletedFalse(category);
        return services.stream().map(mapper::toResponse).toList();
    }

    // ── GET ALL public/customer (active only) ────────────────────────
    public List<ServiceResponse> getAllServices() {
        return serviceRepository.findByDeletedFalse()
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    // ── UPDATE (partial) ─────────────────────────────────────────────
    @Transactional
    public ServiceResponse updateService(Long id, UpdateServiceRequest request, String userEmail) {

        ServiceOffering service = serviceRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Service not found"));

        if (!service.getBusiness().getOwner().getEmail().equals(userEmail))
            throw new RuntimeException("Unauthorized");

        if (request.getName()        != null) service.setName(request.getName());
        if (request.getDescription() != null) service.setDescription(request.getDescription());
        if (request.getPrice()       != null) service.setPrice(request.getPrice());
        if (request.getDuration()    != null) service.setDuration(request.getDuration());
        if (request.getAddress()     != null) service.setAddress(request.getAddress());
        if (request.getCity()        != null) service.setCity(request.getCity());
        if (request.getState()       != null) service.setState(request.getState());
        if (request.getCountry()     != null) service.setCountry(request.getCountry());
        if (request.getPincode()     != null) service.setPincode(request.getPincode());
        if (request.getCategory()    != null) service.setCategory(request.getCategory());

        ServiceType effectiveType = request.getServiceType() != null
                ? ServiceType.valueOf(request.getServiceType())
                : service.getServiceType();
        if (request.getServiceType() != null) service.setServiceType(effectiveType);

        int effectiveGap = request.getGapMinutes() != null
                ? request.getGapMinutes()
                : (service.getGapMinutes() != null ? service.getGapMinutes() : 0);
        if (request.getGapMinutes() != null) service.setGapMinutes(effectiveGap);

        if (effectiveType == ServiceType.CONSULTATION && effectiveGap <= 0)
            throw new RuntimeException(
                    "Gap Between Appointments must be at least 1 minute for Consultation services.");

        return mapper.toResponse(serviceRepository.save(service));
    }

    // ── SOFT DELETE ──────────────────────────────────────────────────
    /**
     * Industry-standard soft delete (Square, Booksy, Fresha pattern).
     *
     * The service row is NEVER physically removed.  All appointment rows
     * keep their service_id FK → price, name, duration stay in history.
     * Revenue reports remain accurate forever.
     *
     * What we DO clean up (things that have no value after deletion):
     *
     *   Table               Action          Reason
     *   ─────────────────── ─────────────── ──────────────────────────────────────
     *   business_holidays   hard DELETE     Schedule for a deleted service is useless
     *   working_hours       hard DELETE     Same — no point keeping hours for a gone service
     *   business_photos     hard DELETE     Free DB row + delete physical file from disk
     *                       + file delete
     *
     * What we do NOT touch:
     *
     *   Table               Reason
     *   ─────────────────── ──────────────────────────────────────────────────────
     *   appointments        History — keep intact, service row still exists (soft delete)
     *   reviews             History — keep intact, service row still exists
     */
    @Transactional
    public void deleteService(Long id, String userEmail) {

        ServiceOffering service = serviceRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Service not found or already deleted"));

        if (!service.getBusiness().getOwner().getEmail().equals(userEmail))
            throw new RuntimeException("Unauthorized");

        // 1. Delete holiday overrides specific to this service
        businessHolidayRepository.deleteByServiceId(id);

        // 2. Delete working-hour configs for this service
        workingHoursRepository.deleteByServiceId(id);

        // 3. Load photo file names BEFORE deleting DB rows
        List<String> photoFileNames = businessPhotoRepository.findFileNamesByServiceId(id);

        // 4. Delete business_photos DB rows for this service
        businessPhotoRepository.deleteByServiceId(id);

        // 5. Delete physical photo files from disk
        //    Done AFTER DB deletion so if file delete fails, DB is already clean.
        //    A missing file is logged as a warning — it should NOT roll back the transaction.
        deletePhysicalFiles(photoFileNames);

        // 6. Soft-delete the service — set flag, never remove the row
        service.setDeleted(true);
        service.setDeletedAt(LocalDateTime.now());
        serviceRepository.save(service);
    }

    // ── Physical file deletion ────────────────────────────────────────
    /**
     * Deletes files from uploadDir/subDir/fileName.
     * Missing files are silently skipped (they may have been cleaned up already).
     * IOExceptions are logged but never propagated — file cleanup should never
     * roll back a successful DB transaction.
     */
    private void deletePhysicalFiles(List<String> fileNames) {
        for (String fileName : fileNames) {
            if (fileName == null || fileName.isBlank()) continue;
            try {
                Path filePath = Paths.get(uploadDir, fileName);
                boolean deleted = Files.deleteIfExists(filePath);
                if (!deleted) {
                    System.err.println("INFO: photo file not found on disk (already removed?): " + filePath);
                }
            } catch (IOException e) {
                // Log but continue — never fail the transaction over a missing file
                System.err.println("WARN: could not delete photo file [" + fileName + "]: " + e.getMessage());
            }
        }
    }
}