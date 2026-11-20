package org.akira.laptopstore.payment.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record StoreCreditResponse(BigDecimal balance, List<Entry> entries) {
    public record Entry(Long id, Long orderId, String kind, BigDecimal amount, BigDecimal balanceAfter, Instant createdAt) {}
}
