package org.akira.laptopstore.order.service;

public interface OrderRefundService {
    Long confirmRefund(Long orderId, Long adminId, Long refundRequestId, boolean returnOrder);
}
