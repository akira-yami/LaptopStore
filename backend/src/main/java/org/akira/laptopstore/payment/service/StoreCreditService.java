package org.akira.laptopstore.payment.service;

import lombok.RequiredArgsConstructor;
import org.akira.laptopstore.exception.BusinessException;
import org.akira.laptopstore.payment.dto.response.StoreCreditResponse;
import org.akira.laptopstore.payment.repository.StoreCreditRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class StoreCreditService {
    private final StoreCreditRepository repository;

    @Transactional(readOnly = true)
    public StoreCreditResponse getWallet(Long userId) {
        var entries = repository.latestEntries(userId);
        return new StoreCreditResponse(entries.isEmpty() ? BigDecimal.ZERO : entries.getFirst().balanceAfter(), entries);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void creditRefund(Long userId, Long orderId, Long refundRequestId, BigDecimal amount) {
        repository.creditRefund(userId, orderId, refundRequestId, amount);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void payForOrder(Long userId, Long orderId, BigDecimal amount) {
        if (amount.signum() == 0) {
            return;
        }
        if (!repository.debitPurchase(userId, orderId, amount)) {
            throw new BusinessException(HttpStatus.CONFLICT, "INSUFFICIENT_STORE_CREDIT",
                    "Số dư StoreCredit không đủ để thanh toán đơn hàng");
        }
    }
}
