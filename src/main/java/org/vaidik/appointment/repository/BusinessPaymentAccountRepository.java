package org.vaidik.appointment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.vaidik.appointment.entity.BusinessPaymentAccount;
import java.util.List;
import java.util.Optional;

public interface BusinessPaymentAccountRepository extends JpaRepository<BusinessPaymentAccount, Long> {

    List<BusinessPaymentAccount> findByBusinessIdAndDeletedAtIsNull(Long businessId);
    Optional<BusinessPaymentAccount> findByBusinessIdAndIsDefaultTrueAndDeletedAtIsNull(Long businessId);
}