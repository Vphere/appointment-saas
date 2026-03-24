package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.vaidik.appointment.dto.*;
import org.vaidik.appointment.entity.*;
import org.vaidik.appointment.repository.*;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BusinessServiceService {

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;

    // CREATE BUSINESS
    public BusinessResponse createBusiness(BusinessRequest request, String ownerEmail) {

        User owner = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Business business = Business.builder()
                .name(request.getName())
                .description(request.getDescription())
                .address(request.getAddress())
                .city(request.getCity())
                .phone(request.getPhone())
                .status(BusinessStatus.PENDING)
                .owner(owner)
                .build();

        businessRepository.save(business);

        return mapToResponse(business);
    }

    // GET ALL APPROVED (for customers)
    public List<BusinessResponse> getApprovedBusinesses() {

        return businessRepository.findByStatus(BusinessStatus.APPROVED)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // GET MY BUSINESSES (owner)
    public List<BusinessResponse> getMyBusinesses(String email) {

        return businessRepository.findByOwnerEmail(email)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // GET ALL (admin)
    public List<BusinessResponse> getAllBusinesses() {

        return businessRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // APPROVE BUSINESS
    public void updateBusinessStatus(Long id, BusinessStatus status) {

        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Business not found"));

        business.setStatus(status);

        businessRepository.save(business);
    }

    // COMMON MAPPER
    private BusinessResponse mapToResponse(Business b) {

        return BusinessResponse.builder()
                .id(b.getId())
                .name(b.getName())
                .description(b.getDescription())
                .status(b.getStatus().name())
                .address(b.getAddress())
                .city(b.getCity())
                .phone(b.getPhone())
                .build();
    }
}