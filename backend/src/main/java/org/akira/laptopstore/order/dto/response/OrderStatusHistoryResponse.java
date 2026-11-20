package org.akira.laptopstore.order.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.akira.laptopstore.order.entity.enums.OrderStatus;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatusHistoryResponse {
    private Long id;
    private OrderStatus fromStatus;
    private OrderStatus toStatus;
    private Instant changedAt;
    private Long changedBy;
    private String note;

    public OrderStatusHistoryResponse(
            Long id, OrderStatus fromStatus, OrderStatus toStatus, Instant changedAt, Long changedBy
    ) {
        this(id, fromStatus, toStatus, changedAt, changedBy, null);
    }
}
