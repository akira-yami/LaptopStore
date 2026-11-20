package org.akira.laptopstore.payment.service.Impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.akira.laptopstore.order.entity.enums.CheckoutPaymentMethod;
import org.akira.laptopstore.order.event.OrderCancelledEvent;
import org.akira.laptopstore.order.event.OrderCreatedEvent;
import org.akira.laptopstore.payment.entity.Payment;
import org.akira.laptopstore.payment.enums.PaymentMethod;
import org.akira.laptopstore.payment.enums.PaymentStatus;
import org.akira.laptopstore.payment.repository.PaymentRepository;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Lắng nghe sự kiện vòng đời đơn hàng trong cùng transaction để đồng bộ dữ liệu Payment
 * mà không tạo phụ thuộc ngược từ module order sang module payment.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderLifecyclePaymentListener {

    private static final Duration ONLINE_PAYMENT_DEADLINE = Duration.ofMinutes(15);

    private final PaymentRepository paymentRepository;

    /**
     * Khởi tạo ngay bản ghi Payment (PENDING) khi đơn hàng được tạo,
     * đảm bảo đơn COD và VNPAY không bao giờ rơi vào trạng thái mồ côi Payment nếu client rớt mạng.
     */
    @EventListener
    public void onOrderCreated(OrderCreatedEvent event) {
        if (event == null || event.orderId() == null || event.paymentMethod() == null) {
            return;
        }
        if (paymentRepository.existsByOrderId(event.orderId())) {
            return;
        }

        PaymentMethod method = event.paymentMethod() == CheckoutPaymentMethod.VNPAY
                ? PaymentMethod.VNPAY
                : PaymentMethod.COD;
        Instant createdAt = event.createdAt() != null ? event.createdAt() : Instant.now();
        Instant expiresAt = method == PaymentMethod.VNPAY
                ? createdAt.plus(ONLINE_PAYMENT_DEADLINE)
                : null;

        Payment payment = Payment.builder()
                .orderId(event.orderId())
                .method(method)
                .amount(event.totalAmount())
                .status(PaymentStatus.PENDING)
                .expiresAt(expiresAt)
                .build();
        paymentRepository.save(payment);
    }

    /**
     * Đồng bộ trạng thái Payment khi đơn hàng bị hủy hoặc hết hạn thanh toán online:
     * - Chỉ cập nhật Payment còn đang PENDING (hết hạn -> FAILED, hủy chủ động -> CANCELLED).
     * - Không bao giờ ghi đè Payment đã PAID để giữ bằng chứng đối soát/hoàn tiền.
     */
    @EventListener
    public void onOrderCancelled(OrderCancelledEvent event) {
        if (event == null || event.orderId() == null) {
            return;
        }
        paymentRepository.findByOrderIdForUpdate(event.orderId()).ifPresent(payment -> {
            if (payment.getStatus() != PaymentStatus.PENDING) {
                return;
            }
            PaymentStatus nextStatus = event.expired() ? PaymentStatus.FAILED : PaymentStatus.CANCELLED;
            payment.setStatus(nextStatus);
            payment.setUpdatedAt(Instant.now());
            paymentRepository.save(payment);
            log.info("Đã đồng bộ Payment paymentId={} của đơn orderId={} sang trạng thái {}",
                    payment.getId(), event.orderId(), nextStatus);
        });
    }
}
