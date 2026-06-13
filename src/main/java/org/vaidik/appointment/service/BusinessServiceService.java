package org.vaidik.appointment.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.dto.*;
import org.vaidik.appointment.entity.*;
import org.vaidik.appointment.mapper.BusinessMapper;
import org.vaidik.appointment.repository.*;
import java.security.SecureRandom;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BusinessServiceService {

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final ServiceOfferingRepository serviceOfferingRepository;
    private final BusinessHolidayRepository holidayRepository;
    private final BusinessPhotoRepository photoRepository;
    private final BusinessDocumentRepository documentRepository;
    private final WorkingHoursRepository workingHoursRepository;
    private final AppointmentRepository appointmentRepository;
    private final BusinessMapper businessMapper;
    private final OtpRepository otpRepository;
    private final EmailService emailService;
    private final Cloudinary cloudinary;

//    @Value("${app.upload.dir:uploads/photos}")
//    private String photoDir;

//    @Value("${app.document.dir:uploads/documents}")
//    private String documentDir;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    // CREATE BUSINESS
    public BusinessResponse createBusiness(BusinessRequest request, String ownerEmail) {

        User owner = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Business business = Business.builder()
                .name(request.getName())
                .description(request.getDescription())
                .phone(request.getPhone())
                .businessType(BusinessType.valueOf(request.getBusinessType()))
                .panNumber(request.getPanNumber())
                .annualTurnover(request.getAnnualTurnover())
                .gstNumber(request.getGstNumber())
                .udyamNumber(request.getUdyamNumber())
                .status(BusinessStatus.PENDING)
                .owner(owner)
                .build();

        Business saved = businessRepository.save(business);

        return businessMapper.toResponse(saved);
    }

    public List<BusinessResponse> getApprovedBusinesses() {
        return businessRepository.findByStatusAndDeletedAtIsNull(BusinessStatus.APPROVED)
                .stream().map(businessMapper::toResponse).toList();
    }

    public List<BusinessResponse> getMyBusinesses(String email) {
        return businessRepository.findByOwnerEmailAndDeletedAtIsNull(email)
                .stream().map(businessMapper::toResponse).toList();
    }

    public List<BusinessResponse> getAllBusinesses() {
        return businessRepository.findAllActive()   // excludes soft-deleted
                .stream().map(businessMapper::toResponse).toList();
    }

    public BusinessResponse getBusinessById(Long id) {
        Business business = businessRepository.findActiveById(id)
                .orElseThrow(() -> new RuntimeException("Business not found"));
        return businessMapper.toResponse(business);
    }

    // GET PENDING (admin)
    public List<BusinessResponse> getPendingBusinesses() {

        return businessRepository.findByStatusAndDeletedAtIsNull(BusinessStatus.PENDING)
                .stream()
                .map(businessMapper::toResponse)
                .toList();
    }

    // APPROVE / REJECT BUSINESS
    public BusinessResponse updateBusinessStatus(Long id, BusinessStatus status) {

        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Business not found"));

        business.setStatus(status);

        // Clear rejection fields if re-approving somehow
        if (status == BusinessStatus.APPROVED) {
            business.setRejectionReason(null);
            business.setRequiredActions(null);
        }
        return businessMapper.toResponse(businessRepository.save(business));
    }

    // REJECT WITH REASON
    public BusinessResponse rejectBusiness(Long id, RejectBusinessRequest request) {
        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Business not found"));

        business.setStatus(BusinessStatus.REJECTED);
        business.setRejectionReason(request.getRejectionReason());
        business.setRequiredActions(request.getRequiredActions());

        return businessMapper.toResponse(businessRepository.save(business));
    }

    public DeleteBusinessPreflightResponse getDeletePreflight(Long businessId, String ownerEmail) {
        Business business = businessRepository.findActiveById(businessId)
                .orElseThrow(() -> new RuntimeException("Business not found"));

        if (!business.getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Not your business");
        }
        if (business.getStatus() != BusinessStatus.APPROVED) {
            throw new RuntimeException("Only approved businesses can be deleted");
        }

        List<Appointment> activeAppointments = appointmentRepository
                .findByBusinessIdAndStatusIn(businessId,
                        List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED));

        // Only count active (non-soft-deleted) services
        List<ServiceOffering> services = serviceOfferingRepository
                .findByBusinessIdAndDeletedFalse(businessId);

        return DeleteBusinessPreflightResponse.builder()
                .message("Preflight check complete")
                .activeAppointmentCount(activeAppointments.size())
                .serviceCount(services.size())
                .build();
    }

    // ── Step 1: send OTP ────────────────────────────────────────────────────────
    public void initiateDeleteRequest(Long businessId, String ownerEmail) {
        Business business = businessRepository.findActiveById(businessId)
                .orElseThrow(() -> new RuntimeException("Business not found"));

        if (!business.getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Not your business");
        }
        if (business.getStatus() != BusinessStatus.APPROVED) {
            throw new RuntimeException("Only approved businesses can be deleted");
        }

        // Reuse your existing OTP infrastructure
        String otp = String.valueOf(100000 + SECURE_RANDOM.nextInt(900000));
        Otp otpEntity = otpRepository.findByEmail(ownerEmail).orElse(new Otp());
        otpEntity.setEmail(ownerEmail);
        otpEntity.setOtp(otp);
        otpEntity.setExpiryTime(LocalDateTime.now().plusMinutes(10));
        otpRepository.save(otpEntity);

        emailService.sendBusinessDeletionOtpEmail(ownerEmail,
                business.getOwner().getName(), business.getName(), otp);
    }

    // ── Step 2: verify OTP + typed name → soft delete ─────────────────────────
    @Transactional
    public void softDeleteBusiness(Long businessId,
                                   DeleteBusinessRequest request,
                                   String ownerEmail) {

        Business business = businessRepository.findActiveById(businessId)
                .orElseThrow(() -> new RuntimeException("Business not found"));

        if (!business.getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Not your business");
        }

        if (!business.getName().equals(request.getBusinessName())) {
            throw new RuntimeException(
                    "Business name does not match. Please type the exact name.");
        }

        Otp savedOtp = otpRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new RuntimeException(
                        "No verification code found. Please request a new one."));

        if (!savedOtp.getOtp().equals(request.getOtp())) {
            throw new RuntimeException("Invalid verification code.");
        }
        if (savedOtp.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException(
                    "Verification code has expired. Please request a new one.");
        }

        LocalDateTime now = LocalDateTime.now();

        // ── 1. Cancel active appointments + notify customers ──────────
        List<Appointment> activeAppointments = appointmentRepository
                .findByBusinessIdAndStatusIn(businessId,
                        List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED));

        for (Appointment appt : activeAppointments) {
            appt.setStatus(AppointmentStatus.CANCELLED);
            appointmentRepository.save(appt);
            
            // Eagerly initialize lazy-loaded relationships before async email
            Hibernate.initialize(appt.getUser());
            Hibernate.initialize(appt.getBusiness());
            Hibernate.initialize(appt.getService());
            
            try {
                emailService.sendBusinessClosureAppointmentCancelEmail(appt);
            } catch (Exception ignored) {}
        }

        // ── 2. Soft delete all service offerings ─────────────────────
        // ServiceOffering has BOTH deleted (boolean) and deletedAt — set both
        List<ServiceOffering> services = serviceOfferingRepository
                .findByBusinessId(businessId);
        for (ServiceOffering service : services) {
            service.setDeletedAt(now);       // timestamp
        }
        serviceOfferingRepository.saveAll(services);

        // ── 3. Delete working hours ───────────────────────────────────
        workingHoursRepository.deleteByBusinessId(businessId);

        // ── 4. Delete business holidays ───────────────────────────────
        holidayRepository.deleteByBusinessId(businessId);

        // ── 5. Delete business photos + files ────────────────────────
//        List<BusinessPhoto> photos = photoRepository.findByBusinessId(businessId);
//        for (BusinessPhoto photo : photos) {
//            try {
//                Path filePath = Paths.get(photoDir).resolve(photo.getFileName());
//                Files.deleteIfExists(filePath);
//            } catch (IOException ignored) {}
//        }
//        photoRepository.deleteByBusinessId(businessId);

        // ── 5. Delete business photos from Cloudinary + DB ───────────────
        List<BusinessPhoto> photos = photoRepository.findByBusinessId(businessId);
        for (BusinessPhoto photo : photos) {
            if (photo.getPublicId() != null) {
                try {
                    cloudinary.uploader().destroy(photo.getPublicId(), ObjectUtils.emptyMap());
                } catch (Exception ignored) {}
            }
        }
        photoRepository.deleteByBusinessId(businessId);

        // ── 6. Delete business documents + files ─────────────────────
//        List<BusinessDocument> documents = documentRepository.findByBusinessId(businessId);
//        for (BusinessDocument doc : documents) {
//            try {
//                Files.deleteIfExists(Paths.get(doc.getFilePath()));
//            } catch (IOException ignored) {}
//        }
//        documentRepository.deleteByBusinessId(businessId);
//
//        try {
//            Path businessDocDir = Paths.get(documentDir, String.valueOf(businessId));
//            Files.deleteIfExists(businessDocDir);
//        } catch (IOException ignored) {}

        // ── 6. Delete business documents from Cloudinary + DB ────────────
        List<BusinessDocument> documents = documentRepository.findByBusinessId(businessId);
        for (BusinessDocument doc : documents) {
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
        }
        documentRepository.deleteByBusinessId(businessId);

        // ── 7. Soft delete the business itself ────────────────────────
        business.setDeletedAt(now);
        businessRepository.save(business);

        // ── 8. Clean up OTP ───────────────────────────────────────────
        otpRepository.deleteByEmail(ownerEmail);
    }

    // OWNER: RESUBMIT (edit + re-submit a rejected business)
    public BusinessResponse resubmitBusiness(Long id, BusinessRequest request, String ownerEmail) {
        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Business not found"));

        if (!business.getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Not your business");
        }
        if (business.getStatus() != BusinessStatus.REJECTED) {
            throw new RuntimeException("Only rejected businesses can be resubmitted");
        }

        business.setName(request.getName());
        business.setDescription(request.getDescription());
        business.setPhone(request.getPhone());
        business.setBusinessType(BusinessType.valueOf(request.getBusinessType()));
        business.setPanNumber(request.getPanNumber());
        business.setAnnualTurnover(request.getAnnualTurnover());
        business.setGstNumber(request.getGstNumber());
        business.setUdyamNumber(request.getUdyamNumber());
        business.setStatus(BusinessStatus.PENDING);
        business.setRejectionReason(null);
        business.setRequiredActions(null);

        return businessMapper.toResponse(businessRepository.save(business));
    }
}