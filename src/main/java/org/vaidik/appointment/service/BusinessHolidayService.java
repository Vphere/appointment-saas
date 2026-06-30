package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.dto.BusinessHolidayRequest;
import org.vaidik.appointment.dto.BusinessHolidayResponse;
import org.vaidik.appointment.entity.Business;
import org.vaidik.appointment.entity.BusinessHoliday;
import org.vaidik.appointment.entity.ServiceOffering;
import org.vaidik.appointment.repository.BusinessHolidayRepository;
import org.vaidik.appointment.repository.BusinessRepository;
import org.vaidik.appointment.repository.ServiceOfferingRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BusinessHolidayService {

    private final BusinessHolidayRepository holidayRepository;
    private final BusinessRepository businessRepository;
    private final ServiceOfferingRepository serviceRepository;

    public List<BusinessHolidayResponse> getHolidays(Long businessId) {
        return holidayRepository.findByBusinessIdOrderByDateAsc(businessId)
                .stream().map(this::toResponse).toList();
    }

    public List<BusinessHolidayResponse> getHolidaysByService(Long serviceId) {
        return holidayRepository.findByServiceIdOrBusinessWide(serviceId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public BusinessHolidayResponse addHoliday(BusinessHolidayRequest req, String ownerEmail) {
        Business business = getAndValidate(req.getBusinessId(), ownerEmail);

        BusinessHoliday.BusinessHolidayBuilder builder = BusinessHoliday.builder()
                .business(business)
                .date(req.getDate())
                .reason(req.getReason())
                .allServices(req.isAllServices());

        if (req.isAllServices()) {
            if (holidayRepository.existsByBusinessIdAndAllServicesTrueAndDate(business.getId(), req.getDate())) {
                throw new RuntimeException("A business-wide holiday already exists for this date.");
            }
        } else {
            ServiceOffering service = serviceRepository.findByIdWithFetch(req.getServiceId())  // ← was findById
                    .orElseThrow(() -> new RuntimeException("Service not found"));
            if (!service.getBusiness().getId().equals(business.getId())) {
                throw new RuntimeException("Service does not belong to this business");
            }
            if (holidayRepository.existsByBusinessIdAndServiceIdAndDate(business.getId(), service.getId(), req.getDate())) {
                throw new RuntimeException("A holiday already exists for this service on this date.");
            }
            builder.service(service);
        }

        return toResponse(holidayRepository.save(builder.build()));
    }

    @Transactional
    public void deleteHoliday(Long holidayId, String ownerEmail) {
        BusinessHoliday holiday = holidayRepository.findById(holidayId)
                .orElseThrow(() -> new RuntimeException("Holiday not found"));

        if (!holiday.getBusiness().getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Unauthorized");
        }

        holidayRepository.delete(holiday);
    }

    private Business getAndValidate(Long businessId, String ownerEmail) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Business not found"));
        if (!business.getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Unauthorized");
        }
        return business;
    }

    private BusinessHolidayResponse toResponse(BusinessHoliday h) {
        return BusinessHolidayResponse.builder()
                .id(h.getId())
                .businessId(h.getBusiness().getId())
                .serviceId(h.getService() != null ? h.getService().getId() : null)
                .allServices(h.isAllServices())
                .date(h.getDate())
                .reason(h.getReason())
                .serviceName(h.getService() != null ? h.getService().getName() : "All Services")
                .build();
    }
}