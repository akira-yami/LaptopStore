package org.akira.laptopstore.order.integration;

import org.akira.laptopstore.cart.dto.request.AddCartItemRequest;
import org.akira.laptopstore.cart.service.CartService;
import org.akira.laptopstore.exception.BusinessException;
import org.akira.laptopstore.exception.ResourceNotFoundException;
import org.akira.laptopstore.exception.ValidationException;
import org.akira.laptopstore.order.dto.request.CheckoutPreviewRequest;
import org.akira.laptopstore.order.dto.request.CreateOrderRequest;
import org.akira.laptopstore.order.dto.request.UpdateOrderStatusRequest;
import org.akira.laptopstore.order.entity.enums.OrderStatus;
import org.akira.laptopstore.order.service.OrderPaymentService;
import org.akira.laptopstore.order.service.OrderService;
import org.akira.laptopstore.payment.dto.request.RecordCodPaymentRequest;
import org.akira.laptopstore.payment.dto.request.StartPaymentRequest;
import org.akira.laptopstore.payment.enums.PaymentMethod;
import org.akira.laptopstore.payment.enums.PaymentStatus;
import org.akira.laptopstore.payment.service.PaymentService;
import org.akira.laptopstore.payment.service.RefundRequestService;
import org.akira.laptopstore.payment.service.StoreCreditService;
import org.akira.laptopstore.promotion.dto.request.RedeemLoyaltyCouponRequest;
import org.akira.laptopstore.promotion.service.LoyaltyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Kiểm thử E2E liên module trên PostgreSQL thật:
 * Cart -> Catalog -> Promotion -> Order -> Inventory -> Payment.
 * Kích hoạt khi truyền -Dcart.test.jdbc-url=... (chạy tự động trên CI).
 */
@EnabledIfSystemProperty(named = "cart.test.jdbc-url", matches = ".+")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {
                "spring.jpa.open-in-view=false",
                "spring.jpa.show-sql=false",
                "app.ai.enabled=false"
        }
)
class OrderLifecycleE2ETest {

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", () -> System.getProperty("cart.test.jdbc-url"));
        properties.add("spring.datasource.username", () -> System.getProperty("cart.test.username", "postgres"));
        properties.add("spring.datasource.password", () -> System.getProperty("cart.test.password", "postgres"));
    }

    @Autowired private CartService cartService;
    @Autowired private OrderService orderService;
    @Autowired private OrderPaymentService orderPaymentService;
    @Autowired private PaymentService paymentService;
    @Autowired private RefundRequestService refundRequestService;
    @Autowired private StoreCreditService storeCreditService;
    @Autowired private LoyaltyService loyaltyService;
    @Autowired private JdbcTemplate jdbc;

    private Long userId;
    private Long staffId;
    private Long addressId;
    private Long variantId;
    private String couponCode;

    @BeforeEach
    void setUpFixtures() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();

        userId = jdbc.queryForObject(
                "insert into users (email, password_hash, full_name, phone, status) values (?, 'hash', 'E2E User', '0901234567', 'ACTIVE') returning id",
                Long.class, "e2e-user-" + suffix + "@example.com");
        staffId = jdbc.queryForObject(
                "insert into users (email, password_hash, full_name, phone, status) values (?, 'hash', 'E2E Staff', '0909999999', 'ACTIVE') returning id",
                Long.class, "e2e-staff-" + suffix + "@example.com");

        addressId = jdbc.queryForObject(
                "insert into addresses (user_id, recipient_name, phone, street, ward, district, city, postal_code, is_default) " +
                        "values (?, 'Phan Anh Khang', '0901234567', '123 Nguyen Trai', 'P2', 'Q5', 'TP.HCM', '700000', true) returning id",
                Long.class, userId);

        Long brandId = jdbc.queryForObject(
                "insert into brands (name, active) values (?, true) returning id",
                Long.class, "Brand-" + suffix);
        Long categoryId = jdbc.queryForObject(
                "insert into categories (name, active) values (?, true) returning id",
                Long.class, "Cat-" + suffix);
        Long productId = jdbc.queryForObject(
                "insert into products (brand_id, category_id, name, status) values (?, ?, 'E2E Laptop', 'ACTIVE') returning id",
                Long.class, brandId, categoryId);

        variantId = jdbc.queryForObject(
                "insert into product_variants (product_id, sku, ram, storage, color, price, quantity, status) " +
                        "values (?, ?, '16GB', '512GB', 'Silver', 20000000.00, 10, 'ACTIVE') returning id",
                Long.class, productId, "SKU-" + suffix);

        couponCode = "E2E" + suffix;
        Instant now = Instant.now();
        jdbc.update(
                "insert into coupons (code, discount_type, discount_value, max_discount, min_order_amount, usage_limit, usage_per_user, starts_at, ends_at, active) " +
                        "values (?, 'FIXED', 500000.00, 500000.00, 10000000.00, 10, 2, ?, ?, true)",
                couponCode,
                Timestamp.from(now.minus(1, ChronoUnit.DAYS)),
                Timestamp.from(now.plus(7, ChronoUnit.DAYS)));
    }

    @Test
    void codCheckoutToDeliveryAndCodPaymentCollectionE2E() {
        // 1. Thêm vào giỏ và xem trước checkout với mã giảm giá
        cartService.addItemToCart(userId, new AddCartItemRequest(variantId, 2));
        var preview = orderService.previewCheckout(userId, CheckoutPreviewRequest.builder()
                .addressId(addressId)
                .paymentMethod("COD")
                .couponCode(couponCode)
                .build());
        assertEquals(0, new BigDecimal("40000000.00").compareTo(preview.getSubtotal()));
        assertEquals(0, new BigDecimal("500000.00").compareTo(preview.getDiscountAmount()));
        assertEquals(0, new BigDecimal("39500000.00").compareTo(preview.getTotalAmount()));

        // 2. Tạo đơn COD kèm Idempotency-Key
        String idemKey = "e2e-cod-" + UUID.randomUUID();
        CreateOrderRequest createReq = CreateOrderRequest.builder()
                .addressId(addressId)
                .paymentMethod("COD")
                .couponCode(couponCode)
                .idempotencyKey(idemKey)
                .build();
        var created = orderService.createOrder(userId, createReq);

        assertEquals(OrderStatus.WAITING_CONFIRMATION, created.getStatus());
        assertEquals(0, new BigDecimal("39500000.00").compareTo(created.getTotalAmount()));
        assertEquals(8, currentStock(variantId));
        assertEquals(0, cartService.getCart(userId).getItems().size());
        assertEquals("ACTIVE", couponUsageStatus(created.getId()));

        // 3. Kiểm tra Idempotency: lặp payload trả đơn cũ; đổi phương thức thanh toán trả 409 CONFLICT
        var replayed = orderService.createOrder(userId, createReq);
        assertEquals(created.getId(), replayed.getId());

        CreateOrderRequest conflictReq = CreateOrderRequest.builder()
                .addressId(addressId)
                .paymentMethod("VNPAY")
                .couponCode(couponCode)
                .idempotencyKey(idemKey)
                .build();
        BusinessException conflictEx = assertThrows(BusinessException.class, () -> orderService.createOrder(userId, conflictReq));
        assertEquals(HttpStatus.CONFLICT, conflictEx.getStatus());
        assertEquals("IDEMPOTENCY_CONFLICT", conflictEx.getCode());

        // 4. Khởi tạo COD payment, Staff chuyển trọn vòng đời đến DELIVERED và xác nhận thu tiền COD
        StartPaymentRequest startPayReq = new StartPaymentRequest();
        startPayReq.setOrderId(created.getId());
        startPayReq.setMethod(PaymentMethod.COD);
        var payment = paymentService.startPayment(userId, startPayReq);
        assertEquals(PaymentStatus.PENDING, payment.getStatus());

        orderService.updateOrderStatus(staffId, created.getId(), new UpdateOrderStatusRequest(OrderStatus.CONFIRMED, null));
        orderService.updateOrderStatus(staffId, created.getId(), new UpdateOrderStatusRequest(OrderStatus.PACKING, null));
        orderService.updateOrderStatus(staffId, created.getId(), new UpdateOrderStatusRequest(OrderStatus.SHIPPING, null));
        assertThrows(ValidationException.class, () -> orderService.cancelOrder(userId, created.getId(), null));
        var delivered = orderService.updateOrderStatus(staffId, created.getId(), new UpdateOrderStatusRequest(OrderStatus.DELIVERED, null));
        assertEquals(OrderStatus.DELIVERED, delivered.getStatus());

        RecordCodPaymentRequest codReq = new RecordCodPaymentRequest();
        codReq.setOrderId(created.getId());
        var paidPayment = paymentService.recordCodPayment(codReq);
        assertEquals(PaymentStatus.PAID, paidPayment.getStatus());
    }

    @ParameterizedTest
    @EnumSource(value = OrderStatus.class, names = {"WAITING_CONFIRMATION", "CONFIRMED", "PACKING"})
    void codCancellationWaitsForApprovalAndRestoresStockAndCouponOnce(OrderStatus status) {
        cartService.addItemToCart(userId, new AddCartItemRequest(variantId, 3));
        var created = orderService.createOrder(userId, CreateOrderRequest.builder()
                .addressId(addressId)
                .paymentMethod("COD")
                .couponCode(couponCode)
                .build());
        if (status == OrderStatus.CONFIRMED || status == OrderStatus.PACKING) {
            orderService.updateOrderStatus(staffId, created.getId(), new UpdateOrderStatusRequest(OrderStatus.CONFIRMED, null));
        }
        var approval = new UpdateOrderStatusRequest(OrderStatus.CANCELLED, null);
        if (status == OrderStatus.PACKING) {
            orderService.updateOrderStatus(staffId, created.getId(), new UpdateOrderStatusRequest(OrderStatus.PACKING, null));
            assertThrows(ValidationException.class, () -> orderService.updateOrderStatus(staffId, created.getId(), approval));
        }

        assertThrows(ResourceNotFoundException.class, () -> orderService.cancelOrder(staffId, created.getId(), null));
        var requested = orderService.cancelOrder(userId, created.getId(), "Đổi cấu hình khác");
        assertEquals(status, requested.getStatus());
        assertEquals("Đổi cấu hình khác", requested.getCancellationRequestReason());
        assertEquals("Đổi cấu hình khác", orderService.cancelOrder(userId, created.getId(), "Gửi lại").getCancellationRequestReason());
        assertEquals(7, currentStock(variantId));
        assertEquals("ACTIVE", couponUsageStatus(created.getId()));
        assertEquals("PENDING", paymentStatus(created.getId()));

        var nextStatus = switch (status) {
            case WAITING_CONFIRMATION -> OrderStatus.CONFIRMED;
            case CONFIRMED -> OrderStatus.PACKING;
            case PACKING -> OrderStatus.SHIPPING;
            default -> throw new AssertionError(status);
        };
        var blocked = assertThrows(BusinessException.class, () -> orderService.updateOrderStatus(
                staffId, created.getId(), new UpdateOrderStatusRequest(nextStatus, null)));
        assertEquals("CANCELLATION_REQUEST_PENDING", blocked.getCode());

        var cancelled = orderService.updateOrderStatus(staffId, created.getId(), approval);
        assertEquals(OrderStatus.CANCELLED, cancelled.getStatus());
        assertNull(cancelled.getCancellationRequestReason());
        assertEquals(10, currentStock(variantId));
        assertEquals("RELEASED", couponUsageStatus(created.getId()));
        assertEquals("CANCELLED", paymentStatus(created.getId()));
        assertEquals("Đổi cấu hình khác", cancelled.getStatusHistories().getFirst().getNote());
        assertEquals(staffId, cancelled.getStatusHistories().getFirst().getChangedBy());

        // Hủy lặp lần 2 không được cộng tồn kho thêm lần nữa
        orderService.updateOrderStatus(staffId, created.getId(), approval);
        assertEquals(10, currentStock(variantId));
    }

    @Test
    void vnpayOrderExpirationBlocksLatePaymentResurrectionE2E() {
        cartService.addItemToCart(userId, new AddCartItemRequest(variantId, 1));
        var created = orderService.createOrder(userId, CreateOrderRequest.builder()
                .addressId(addressId)
                .paymentMethod("VNPAY")
                .build());

        assertEquals(OrderStatus.PENDING_PAYMENT, created.getStatus());
        assertEquals(9, currentStock(variantId));

        // Đẩy created_at lùi về 20 phút trước để kích hoạt hết hạn 15 phút
        jdbc.update("update orders set created_at = ? where id = ?",
                Timestamp.from(Instant.now().minus(20, ChronoUnit.MINUTES)), created.getId());

        int expiredCount = orderService.expirePendingOrders(Duration.ofMinutes(15));
        assertTrue(expiredCount >= 1);
        assertEquals(OrderStatus.CANCELLED, orderService.getStaffOrder(created.getId()).getStatus());
        assertEquals(10, currentStock(variantId));

        // Callback VNPay đến trễ không được hồi sinh đơn đã CANCELLED
        boolean confirmed = orderPaymentService.confirmOnlinePayment(created.getId());
        assertFalse(confirmed);
        assertEquals(OrderStatus.CANCELLED, orderService.getStaffOrder(created.getId()).getStatus());
    }

    @Test
    void twoUsersCanUseSameIdempotencyKeyIndependentlyAndSameUserCannotDuplicateInDbE2E() {
        String sharedIdempotencyKey = "shared-idem-key-" + UUID.randomUUID();

        // User 1 tạo đơn với Idempotency-Key dùng chung
        cartService.addItemToCart(userId, new AddCartItemRequest(variantId, 1));
        var orderUser1 = orderService.createOrder(userId, CreateOrderRequest.builder()
                .addressId(addressId)
                .paymentMethod("COD")
                .idempotencyKey(sharedIdempotencyKey)
                .build());

        // User 2 (dùng staffId làm user thứ 2) tạo đơn với CÙNG Idempotency-Key phải thành công, không lỗi 23505
        cartService.addItemToCart(staffId, new AddCartItemRequest(variantId, 1));
        var orderUser2 = orderService.createOrder(staffId, CreateOrderRequest.builder()
                .recipientName("E2E User 2")
                .recipientPhone("0909999999")
                .shippingAddress("456 Le Loi, Q1, TP.HCM")
                .paymentMethod("COD")
                .idempotencyKey(sharedIdempotencyKey)
                .build());

        assertNotEquals(orderUser1.getId(), orderUser2.getId());
        assertEquals(userId, orderUser1.getUserId());
        assertEquals(staffId, orderUser2.getUserId());

        // Cùng user_id + idempotency_key vẫn bị ràng buộc uq_orders_user_idempotency_key chặn ở tầng DB
        DataIntegrityViolationException duplicateSameUserEx = assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbc.update(
                        "insert into orders (user_id, order_code, status, subtotal, discount_amount, shipping_fee, total_amount, recipient_name, recipient_phone, shipping_address, idempotency_key) " +
                                "values (?, ?, 'WAITING_CONFIRMATION', 100, 0, 0, 100, 'Dup', '0900000000', 'Addr', ?)",
                        userId,
                        "ORD-DUP-" + UUID.randomUUID().toString().substring(0, 8),
                        sharedIdempotencyKey
                )
        );
        assertTrue(duplicateSameUserEx.getMessage().contains("uq_orders_user_idempotency_key"));

        // Cùng user vẫn tạo được nhiều đơn khi idempotency_key = NULL
        cartService.addItemToCart(userId, new AddCartItemRequest(variantId, 1));
        var nullKeyOrder1 = orderService.createOrder(userId, CreateOrderRequest.builder()
                .addressId(addressId)
                .paymentMethod("COD")
                .build());
        cartService.addItemToCart(userId, new AddCartItemRequest(variantId, 1));
        var nullKeyOrder2 = orderService.createOrder(userId, CreateOrderRequest.builder()
                .addressId(addressId)
                .paymentMethod("COD")
                .build());
        assertNotEquals(nullKeyOrder1.getId(), nullKeyOrder2.getId());
    }

    @Test
    void deliveredOrderAwardsLoyaltyPointsAndUserCanRedeemCouponAndCheckoutWithItE2E() {
        cartService.addItemToCart(userId, new AddCartItemRequest(variantId, 1));
        var created = orderService.createOrder(userId, CreateOrderRequest.builder()
                .addressId(addressId)
                .paymentMethod("COD")
                .build());

        UpdateOrderStatusRequest confirm = new UpdateOrderStatusRequest();
        confirm.setStatus(OrderStatus.CONFIRMED);
        orderService.updateOrderStatus(staffId, created.getId(), confirm);

        UpdateOrderStatusRequest pack = new UpdateOrderStatusRequest();
        pack.setStatus(OrderStatus.PACKING);
        orderService.updateOrderStatus(staffId, created.getId(), pack);

        UpdateOrderStatusRequest ship = new UpdateOrderStatusRequest();
        ship.setStatus(OrderStatus.SHIPPING);
        orderService.updateOrderStatus(staffId, created.getId(), ship);

        UpdateOrderStatusRequest deliver = new UpdateOrderStatusRequest();
        deliver.setStatus(OrderStatus.DELIVERED);
        orderService.updateOrderStatus(staffId, created.getId(), deliver);

        // Đơn 20.000.000 ₫ giao thành công -> cộng 200 điểm Loyalty
        var overviewAfterDelivery = loyaltyService.getMyLoyaltyOverview(userId);
        assertEquals(200, overviewAfterDelivery.getPointsBalance());
        assertEquals(200, overviewAfterDelivery.getTotalEarned());

        // Đổi 100 điểm sang Coupon giảm 120.000 ₫
        var redeemed = loyaltyService.redeemPointsForCoupon(userId, new RedeemLoyaltyCouponRequest("COUPON_120K"));
        assertEquals(100, redeemed.getPointsBalance());
        assertTrue(redeemed.getCoupon().isPersonal());
        String personalCode = redeemed.getCoupon().getCode();

        // Dùng mã vừa đổi từ Loyalty để đặt đơn mới
        cartService.addItemToCart(userId, new AddCartItemRequest(variantId, 1));
        var orderWithLoyaltyCoupon = orderService.createOrder(userId, CreateOrderRequest.builder()
                .addressId(addressId)
                .paymentMethod("COD")
                .couponCode(personalCode)
                .build());
        assertEquals(new BigDecimal("120000.00"), orderWithLoyaltyCoupon.getDiscountAmount());
        assertEquals(personalCode, orderWithLoyaltyCoupon.getCouponCodeSnapshot());
    }

    @Test
    void refundFundsWalletCheckoutAndInsufficientBalanceRollsBackOrder() {
        cartService.addItemToCart(userId, new AddCartItemRequest(variantId, 2));
        var original = orderService.createOrder(userId, CreateOrderRequest.builder()
                .addressId(addressId).paymentMethod("COD").build());
        for (OrderStatus step : List.of(OrderStatus.CONFIRMED, OrderStatus.PACKING, OrderStatus.SHIPPING, OrderStatus.DELIVERED)) {
            orderService.updateOrderStatus(staffId, original.getId(), new UpdateOrderStatusRequest(step, null));
        }
        var collection = new RecordCodPaymentRequest();
        collection.setOrderId(original.getId());
        paymentService.recordCodPayment(collection);

        var refund = refundRequestService.submit(userId, original.getId(), "Yêu cầu hoàn tiền", List.of());
        var approved = refundRequestService.review(staffId, refund.id(), true, true, null);
        assertEquals(OrderStatus.RETURNED, approved.orderStatus());
        assertEquals(10, currentStock(variantId));
        refundRequestService.review(staffId, refund.id(), true, true, null);
        assertEquals(10, currentStock(variantId));
        assertEquals(new BigDecimal("40000000.00"), storeCreditService.getWallet(userId).balance());

        cartService.addItemToCart(userId, new AddCartItemRequest(variantId, 1));
        var checkout = CreateOrderRequest.builder()
                .addressId(addressId).paymentMethod("STORE_CREDIT").couponCode(couponCode)
                .idempotencyKey("store-credit-" + UUID.randomUUID()).build();
        var purchased = orderService.createOrder(userId, checkout);
        assertEquals(OrderStatus.CONFIRMED, purchased.getStatus());
        assertEquals(new BigDecimal("19500000.00"), purchased.getTotalAmount());
        var payment = paymentService.getByOrderId(userId, purchased.getId());
        assertEquals(PaymentMethod.STORE_CREDIT, payment.getMethod());
        assertEquals(PaymentStatus.PAID, payment.getStatus());
        assertEquals(9, currentStock(variantId));
        assertEquals(purchased.getId(), orderService.createOrder(userId, checkout).getId());
        var wallet = storeCreditService.getWallet(userId);
        assertEquals(new BigDecimal("20500000.00"), wallet.balance());
        assertEquals(List.of("PURCHASE", "REFUND"), wallet.entries().stream().map(entry -> entry.kind()).toList());

        cartService.addItemToCart(userId, new AddCartItemRequest(variantId, 2));
        String failingKey = "store-credit-" + UUID.randomUUID();
        var tooExpensive = CreateOrderRequest.builder()
                .addressId(addressId).paymentMethod("STORE_CREDIT").couponCode(couponCode)
                .idempotencyKey(failingKey).build();
        var failure = assertThrows(BusinessException.class, () -> orderService.createOrder(userId, tooExpensive));
        assertEquals("INSUFFICIENT_STORE_CREDIT", failure.getCode());
        assertEquals(wallet, storeCreditService.getWallet(userId));
        assertEquals(9, currentStock(variantId));
        assertEquals(2, cartService.getCart(userId).getItems().getFirst().getQuantity());
        assertEquals(0L, jdbc.queryForObject("select count(*) from orders where idempotency_key = ?", Long.class, failingKey));
    }

    private int currentStock(Long id) {
        Integer qty = jdbc.queryForObject("select quantity from product_variants where id = ?", Integer.class, id);
        return qty == null ? 0 : qty;
    }

    private String couponUsageStatus(Long orderId) {
        return jdbc.queryForObject("select status from coupon_usages where order_id = ?", String.class, orderId);
    }

    private String paymentStatus(Long orderId) {
        return jdbc.queryForObject("select status from payments where order_id = ?", String.class, orderId);
    }
}
