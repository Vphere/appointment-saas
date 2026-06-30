package org.vaidik.appointment.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.dto.CreateServiceRequest;
import org.vaidik.appointment.dto.ServiceResponse;
import org.vaidik.appointment.dto.UpdateServiceRequest;
import org.vaidik.appointment.entity.*;
import org.vaidik.appointment.mapper.ServiceOfferingMapper;
import org.vaidik.appointment.repository.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ServiceOfferingService {

    private final ServiceOfferingRepository serviceRepository;
    private final BusinessRepository        businessRepository;
    private final UserRepository            userRepository;
    private final ServiceOfferingMapper     mapper;
    private final BusinessHolidayRepository businessHolidayRepository;
    private final WorkingHoursRepository    workingHoursRepository;
    private final BusinessPhotoRepository   businessPhotoRepository;
    private final BusinessPaymentAccountRepository paymentAccountRepository;
    private final AppointmentRepository     appointmentRepository;
    private final Cloudinary                cloudinary;

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
                .build();

        if (request.getPaymentAccountId() != null) {
            BusinessPaymentAccount account = paymentAccountRepository
                    .findById(request.getPaymentAccountId())
                    .orElseThrow(() -> new RuntimeException("Payment account not found"));
            service.setPaymentAccount(account);
        }

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

    public List<ServiceResponse> getPopularServices(int limit) {
        // Step 1 – ranked service IDs from appointment counts
        List<Long> rankedIds = appointmentRepository.findMostBookedServiceIds(limit);

        // Step 2 – fetch each service in rank order (only active ones)
        List<ServiceResponse> result = new ArrayList<>();
        for (Long id : rankedIds) {
            serviceRepository.findByIdAndDeletedFalse(id)
                    .map(mapper::toResponse)
                    .ifPresent(result::add);
        }

        // Step 3 – pad with fallback services if we still need more
        if (result.size() < limit) {
            Set<Long> alreadyIn = rankedIds.stream().collect(Collectors.toSet());
            List<ServiceOffering> allActive = serviceRepository.findByDeletedFalse();
            for (ServiceOffering s : allActive) {
                if (result.size() >= limit) break;
                if (!alreadyIn.contains(s.getId())) {
                    result.add(mapper.toResponse(s));
                    alreadyIn.add(s.getId());
                }
            }
        }

        return result;
    }

    // ── NEARBY SERVICES ──────────────────────────────────────────────
    /**
     * Returns active services whose city is within {@code radiusKm} kilometres
     * of the supplied coordinates, ordered by distance ascending.
     *
     * Because service rows store city/state as text (no lat/lng column), we use
     * the Haversine formula on a per-city cache built from the current service list.
     * This is accurate enough for city-level proximity and requires zero schema change.
     *
     * For production-scale deployments where geocoding precision matters, store
     * lat/lng columns on the ServiceOffering entity and replace the city-lookup
     * below with a direct coordinate comparison.
     */
    public List<ServiceResponse> getNearbyServices(double userLat, double userLng, double radiusKm) {
        List<ServiceOffering> allActive = serviceRepository.findByDeletedFalse();

        // Build a map of city -> approximate coordinates using a bundled lookup.
        // Services whose city is not in the lookup (or whose city field is blank)
        // are excluded from the nearby result rather than guessed at.
        return allActive.stream()
                .filter(s -> s.getCity() != null && !s.getCity().isBlank())
                .filter(s -> {
                    double[] coords = CityCoordinates.get(s.getCity().trim().toLowerCase());
                    if (coords == null) return false;
                    double distKm = haversineKm(userLat, userLng, coords[0], coords[1]);
                    return distKm <= radiusKm;
                })
                .sorted((a, b) -> {
                    double[] ca = CityCoordinates.get(a.getCity().trim().toLowerCase());
                    double[] cb = CityCoordinates.get(b.getCity().trim().toLowerCase());
                    double da = haversineKm(userLat, userLng, ca[0], ca[1]);
                    double db = haversineKm(userLat, userLng, cb[0], cb[1]);
                    return Double.compare(da, db);
                })
                .map(mapper::toResponse)
                .toList();
    }

    /** Haversine great-circle distance between two lat/lng points in km. */
    private static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371.0; // Earth radius km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

        if (request.getPaymentAccountId() != null) {
            BusinessPaymentAccount account = paymentAccountRepository
                    .findById(request.getPaymentAccountId())
                    .orElseThrow(() -> new RuntimeException("Payment account not found"));
            service.setPaymentAccount(account);
        }

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
    @Transactional
    public void deleteService(Long id, String userEmail) {

        ServiceOffering service = serviceRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Service not found or already deleted"));

        if (!service.getBusiness().getOwner().getEmail().equals(userEmail))
            throw new RuntimeException("Unauthorized");

        businessHolidayRepository.deleteByServiceId(id);
        workingHoursRepository.deleteByServiceId(id);

        List<BusinessPhoto> photos = businessPhotoRepository.findByServiceId(id);

        for (BusinessPhoto photo : photos) {
            if (photo.getPublicId() != null) {
                try {
                    cloudinary.uploader().destroy(photo.getPublicId(), ObjectUtils.emptyMap());
                } catch (Exception e) {
                    System.err.println("WARN: could not delete Cloudinary photo: " + e.getMessage());
                }
            }
        }

        businessPhotoRepository.deleteByServiceId(id);

        service.setDeletedAt(LocalDateTime.now());
        serviceRepository.save(service);
    }
}