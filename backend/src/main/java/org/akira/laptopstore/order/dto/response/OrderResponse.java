package org.akira.laptopstore.order.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.akira.laptopstore.order.entity.enums.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private Long id;
    private Long userId;
    private String orderCode;
    private OrderStatus status;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal shippingFee;
    private BigDecimal totalAmount;
    private String recipientName;
    private String recipientPhone;
    private String shippingAddress;
    private String couponCodeSnapshot;
    private String note;
    private List<OrderItemResponse> items;
    private List<OrderStatusHistoryResponse> statusHistories;
    private Instant createdAt;
    private Instant updatedAt;

    public OrderResponse(
            Long id, Long userId, String orderCode, OrderStatus status,
            BigDecimal subtotal, BigDecimal discountAmount, BigDecimal shippingFee, BigDecimal totalAmount,
            String recipientName, String recipientPhone, String shippingAddress,
            String couponCodeSnapshot,
            List<OrderItemResponse> items, List<OrderStatusHistoryResponse> statusHistories,
            Instant createdAt, Instant updatedAt
    ) {
        this(id, userId, orderCode, status, subtotal, discountAmount, shippingFee, totalAmount,
                recipientName, recipientPhone, shippingAddress, couponCodeSnapshot, null,
                items, statusHistories, createdAt, updatedAt);
    }
}
