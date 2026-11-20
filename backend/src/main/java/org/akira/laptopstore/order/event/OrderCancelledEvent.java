package org.akira.laptopstore.order.event;

/**
 * Sự kiện nội bộ phát ra trong cùng transaction khi đơn hàng chuyển sang trạng thái CANCELLED
 * (do khách hủy, staff hủy hoặc quá hạn thanh toán online).
 * Module payment lắng nghe để đồng bộ hủy/hết hạn bản ghi Payment còn đang PENDING.
 */
public record OrderCancelledEvent(
        Long orderId,
        boolean expired
) {
}
