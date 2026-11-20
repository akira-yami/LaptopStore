package org.akira.laptopstore.order.event;

import org.akira.laptopstore.order.entity.enums.CheckoutPaymentMethod;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Sự kiện nội bộ phát ra trong cùng transaction khi đơn hàng vừa được tạo thành công.
 * Module payment lắng nghe để khởi tạo bản ghi Payment đồng bộ, tránh đơn COD/VNPay mồ côi payment.
 */
public record OrderCreatedEvent(
        Long orderId,
        Long userId,
        CheckoutPaymentMethod paymentMethod,
        BigDecimal totalAmount,
        Instant createdAt
) {
}
