package org.akira.laptopstore.order.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import org.akira.laptopstore.order.entity.enums.CheckoutPaymentMethod;
import org.akira.laptopstore.order.entity.enums.OrderStatus;

@Entity
@Table(
        name = "orders",
        uniqueConstraints = {
                // Thống nhất với logic tra cứu findByIdempotencyKeyAndUserId: duy nhất theo từng user thay vì toàn hệ thống.
                @UniqueConstraint(
                        name = "uq_orders_user_idempotency_key",
                        columnNames = {"user_id", "idempotency_key"}
                )
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, unique = true)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "order_code", nullable = false, unique = true)
    private String orderCode;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    @Column(name = "payment_method", length = 30)
    @Enumerated(EnumType.STRING)
    private CheckoutPaymentMethod paymentMethod;

    @Column(name = "cancellation_request_reason", length = 500)
    private String cancellationRequestReason;

    @Column(name = "subtotal", nullable = false)
    private BigDecimal subtotal;

    @Column(name = "discount_amount", nullable = false)
    private BigDecimal discountAmount;

    @Column(name = "shipping_fee", nullable = false)
    private BigDecimal shippingFee;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "recipient_name", nullable = false)
    private String recipientName;

    @Column(name = "recipient_phone", nullable = false)
    private String recipientPhone;

    @Column(name = "shipping_address", nullable = false)
    private String shippingAddress;

    @Column(name = "coupon_code_snapshot")
    private String couponCodeSnapshot;

    // Ghi chú giao hàng khách nhập tại bước Checkout.
    @Column(name = "note", length = 500)
    private String note;

    // Không đặt unique = true đơn lẻ; phạm vi duy nhất theo cặp (user_id, idempotency_key) được khai báo ở @Table và Flyway V8.
    @Column(name = "idempotency_key")
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
