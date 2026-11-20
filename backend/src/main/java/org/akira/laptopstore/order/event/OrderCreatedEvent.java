package org.akira.laptopstore.order.event;

import org.akira.laptopstore.order.entity.enums.CheckoutPaymentMethod;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Sự kiện nội bộ phát ra trong cùng transaction khi đơn hàng vừa được tạo thành công.
 * Module payment lắng nghe để ghi bản thanh toán và xử lý StoreCredit trong cùng transaction.
 */
public record OrderCreatedEvent(
        Long orderId,
        Long userId,
        CheckoutPaymentMethod paymentMethod,
        BigDecimal totalAmount,
        Instant createdAt
) {
}
