package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.BusinessRequest;
import org.vaidik.appointment.dto.BusinessResponse;
import org.vaidik.appointment.entity.Business;
import org.vaidik.appointment.entity.BusinessStatus;
import org.vaidik.appointment.entity.BusinessType;
import org.vaidik.appointment.entity.User;
import org.vaidik.appointment.mapper.BusinessMapper;
import org.vaidik.appointment.repository.BusinessRepository;
import org.vaidik.appointment.repository.UserRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BusinessServiceService {

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final BusinessMapper businessMapper;

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

    // GET ALL APPROVED (for customers)
    public List<BusinessResponse> getApprovedBusinesses() {

        return businessRepository.findByStatus(BusinessStatus.APPROVED)
                .stream()
                .map(businessMapper::toResponse)
                .toList();
    }

    // GET MY BUSINESSES (owner)
    public List<BusinessResponse> getMyBusinesses(String email) {

        return businessRepository.findByOwnerEmail(email)
                .stream()
                .map(businessMapper::toResponse)
                .toList();
    }

    // GET ALL (admin)
    public List<BusinessResponse> getAllBusinesses() {

        return businessRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(businessMapper::toResponse)
                .toList();
    }

    // GET PENDING (admin)
    public List<BusinessResponse> getPendingBusinesses() {

        return businessRepository.findByStatus(BusinessStatus.PENDING)
                .stream()
                .map(businessMapper::toResponse)
                .toList();
    }

    // APPROVE / REJECT BUSINESS
    public BusinessResponse updateBusinessStatus(Long id, BusinessStatus status) {

        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Business not found"));

        business.setStatus(status);

        Business saved = businessRepository.save(business);

        return businessMapper.toResponse(saved);
    }

    // GET BUSINESS BY ID
    public BusinessResponse getBusinessById(Long id) {

        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Business not found"));

        return businessMapper.toResponse(business);
    }
}