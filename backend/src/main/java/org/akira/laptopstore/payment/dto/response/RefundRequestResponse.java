package org.akira.laptopstore.payment.dto.response;

import org.akira.laptopstore.payment.enums.RefundRequestStatus;
import org.akira.laptopstore.order.entity.enums.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record RefundRequestResponse(
        Long id,
        Long orderId,
        OrderStatus orderStatus,
        BigDecimal amount,
        String reason,
        RefundRequestStatus status,
        Instant createdAt,
        Instant reviewedAt,
        Long reviewedByUserId,
        String reviewNote,
        boolean creditedToStoreCredit,
        List<Long> evidenceIds
) {}
