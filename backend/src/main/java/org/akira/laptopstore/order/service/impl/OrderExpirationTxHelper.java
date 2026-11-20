package org.akira.laptopstore.order.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.akira.laptopstore.inventory.dto.request.OrderStockDeduction;
import org.akira.laptopstore.inventory.service.InventoryService;
import org.akira.laptopstore.order.entity.Order;
import org.akira.laptopstore.order.entity.OrderItem;
import org.akira.laptopstore.order.entity.OrderStatusHistory;
import org.akira.laptopstore.order.entity.enums.OrderStatus;
import org.akira.laptopstore.order.event.OrderCancelledEvent;
import org.akira.laptopstore.order.repository.OrderItemRepository;
import org.akira.laptopstore.order.repository.OrderRepository;
import org.akira.laptopstore.order.repository.OrderStatusHistoryRepository;
import org.akira.laptopstore.promotion.service.CouponService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Xử lý hủy từng đơn chờ thanh toán quá hạn trong một transaction độc lập (REQUIRES_NEW).
 * - Dùng FOR UPDATE SKIP LOCKED để nhiều instance backend không tranh chấp lock nhau.
 * - Nếu 1 đơn lỗi (vd lỗi hoàn tồn/coupon), chỉ đơn đó rollback, không làm rollback các đơn khác trong batch.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderExpirationTxHelper {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final InventoryService inventoryService;
    private final CouponService couponService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean expireSinglePendingOrder(Long orderId, Instant cutoffTime) {
        Order order = orderRepository.findByIdForUpdateSkipLocked(orderId).orElse(null);
        if (order == null) {
            return false;
        }
        // Kiểm tra lại trạng thái và thời hạn sau khi đã giữ khóa dòng, phòng trường hợp vừa thanh toán/hủy xong.
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            return false;
        }
        if (order.getCreatedAt() != null && !order.getCreatedAt().isBefore(cutoffTime)) {
            return false;
        }

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
        orderStatusHistoryRepository.save(OrderStatusHistory.builder()
                .order(order)
                .fromStatus(OrderStatus.PENDING_PAYMENT)
                .toStatus(OrderStatus.CANCELLED)
                .changedAt(Instant.now())
                .changedByUserId(null)
                .note("Tự động hủy do quá thời hạn thanh toán online")
                .build());

        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        List<OrderStockDeduction> lines = items.stream()
                .map(item -> new OrderStockDeduction(item.getVariantId(), item.getQuantity()))
                .toList();
        if (!lines.isEmpty()) {
            inventoryService.restoreForOrder(order.getId(), null, lines);
        }
        if (order.getCouponCodeSnapshot() != null) {
            couponService.releaseForOrder(order.getId());
        }

        // Phát event trong cùng transaction để đồng bộ chuyển Payment đang PENDING sang FAILED.
        eventPublisher.publishEvent(new OrderCancelledEvent(order.getId(), true));
        return true;
    }
}
