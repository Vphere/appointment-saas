package org.vaidik.appointment.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vaidik.appointment.dto.BusinessPaymentAccountRequest;
import org.vaidik.appointment.dto.BusinessPaymentAccountResponse;
import org.vaidik.appointment.entity.Business;
import org.vaidik.appointment.entity.BusinessPaymentAccount;
import org.vaidik.appointment.entity.User;
import org.vaidik.appointment.repository.BusinessPaymentAccountRepository;
import org.vaidik.appointment.repository.BusinessRepository;
import org.vaidik.appointment.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BusinessPaymentAccountService {

    private final BusinessPaymentAccountRepository accountRepository;
    private final BusinessRepository               businessRepository;
    private final UserRepository                   userRepository;

    public List<BusinessPaymentAccountResponse> getAccounts(Long businessId, String ownerEmail) {
        verifyOwnership(businessId, ownerEmail);
        return accountRepository
                .findByBusinessIdAndDeletedAtIsNull(businessId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public BusinessPaymentAccountResponse addAccount(BusinessPaymentAccountRequest req,
                                                     String ownerEmail) {
        Business business = verifyOwnership(req.getBusinessId(), ownerEmail);

        boolean makeDefault = Boolean.TRUE.equals(req.getIsDefault());

        // If this is to be default, unset existing default
        if (makeDefault) {
            accountRepository
                    .findByBusinessIdAndIsDefaultTrueAndDeletedAtIsNull(req.getBusinessId())
                    .ifPresent(existing -> {
                        existing.setIsDefault(false);
                        accountRepository.save(existing);
                    });
        }

        // If this is the first account for the business, auto-set as default
        List<BusinessPaymentAccount> existing =
                accountRepository.findByBusinessIdAndDeletedAtIsNull(req.getBusinessId());
        if (existing.isEmpty()) makeDefault = true;

        BusinessPaymentAccount account = BusinessPaymentAccount.builder()
                .business(business)
                .accountHolderName(req.getAccountHolderName().trim())
                .accountNumber(req.getAccountNumber().trim())
                .ifscCode(req.getIfscCode().trim().toUpperCase())
                .bankName(req.getBankName() != null ? req.getBankName().trim() : null)
                .nickname(req.getNickname() != null ? req.getNickname().trim() : null)
                .isDefault(makeDefault)
                .isVerified(true) // test mode: skip penny drop
                .build();

        return toResponse(accountRepository.save(account));
    }

    @Transactional
    public BusinessPaymentAccountResponse setDefault(Long accountId, String ownerEmail) {
        BusinessPaymentAccount account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        verifyOwnership(account.getBusiness().getId(), ownerEmail);

        // Unset old default
        accountRepository
                .findByBusinessIdAndIsDefaultTrueAndDeletedAtIsNull(account.getBusiness().getId())
                .ifPresent(old -> { old.setIsDefault(false); accountRepository.save(old); });

        account.setIsDefault(true);
        return toResponse(accountRepository.save(account));
    }

    @Transactional
    public void deleteAccount(Long accountId, String ownerEmail) {
        BusinessPaymentAccount account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        verifyOwnership(account.getBusiness().getId(), ownerEmail);

        // Soft delete
        account.setDeletedAt(LocalDateTime.now());
        accountRepository.save(account);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Business verifyOwnership(Long businessId, String ownerEmail) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Business not found"));
        if (!business.getOwner().getEmail().equals(ownerEmail)) {
            throw new RuntimeException("Not authorized for this business");
        }
        return business;
    }

    private BusinessPaymentAccountResponse toResponse(BusinessPaymentAccount a) {
        String acctNo = a.getAccountNumber();
        String masked = acctNo.length() > 4
                ? "••••" + acctNo.substring(acctNo.length() - 4)
                : "••••";
        return BusinessPaymentAccountResponse.builder()
                .id(a.getId())
                .businessId(a.getBusiness().getId())
                .accountHolderName(a.getAccountHolderName())
                .maskedAccountNumber(masked)
                .ifscCode(a.getIfscCode())
                .bankName(a.getBankName())
                .nickname(a.getNickname())
                .isDefault(a.getIsDefault())
                .isVerified(a.getIsVerified())
                .build();
    }
}