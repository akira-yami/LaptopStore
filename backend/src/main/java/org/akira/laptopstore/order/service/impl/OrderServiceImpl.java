package org.akira.laptopstore.order.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.akira.laptopstore.cart.dto.response.CartItemResponse;
import org.akira.laptopstore.cart.dto.response.CartResponse;
import org.akira.laptopstore.cart.dto.response.CartSnapshot;
import org.akira.laptopstore.cart.service.CartService;
import org.akira.laptopstore.catalog.dto.response.CheckoutVariantSnapshot;
import org.akira.laptopstore.catalog.service.CatalogCheckoutService;
import org.akira.laptopstore.exception.BusinessException;
import org.akira.laptopstore.exception.ResourceNotFoundException;
import org.akira.laptopstore.exception.UnauthenticatedException;
import org.akira.laptopstore.exception.ValidationException;
import org.akira.laptopstore.inventory.dto.request.OrderStockDeduction;
import org.akira.laptopstore.inventory.service.InventoryService;
import org.akira.laptopstore.order.dto.request.CheckoutPreviewRequest;
import org.akira.laptopstore.order.dto.request.CreateOrderRequest;
import org.akira.laptopstore.order.dto.request.UpdateOrderStatusRequest;
import org.akira.laptopstore.order.dto.response.CheckoutPreviewResponse;
import org.akira.laptopstore.order.dto.response.OrderDashboardSummaryResponse;
import org.akira.laptopstore.order.dto.response.OrderItemResponse;
import org.akira.laptopstore.order.dto.response.OrderResponse;
import org.akira.laptopstore.order.dto.response.OrderSummaryResponse;
import org.akira.laptopstore.order.entity.Order;
import org.akira.laptopstore.order.entity.OrderItem;
import org.akira.laptopstore.order.entity.OrderStatusHistory;
import org.akira.laptopstore.order.entity.enums.CheckoutPaymentMethod;
import org.akira.laptopstore.order.entity.enums.OrderStatus;
import org.akira.laptopstore.order.mapper.OrderMapper;
import org.akira.laptopstore.order.repository.OrderItemRepository;
import org.akira.laptopstore.order.repository.OrderRepository;
import org.akira.laptopstore.order.repository.OrderStatusHistoryRepository;
import org.akira.laptopstore.order.service.OrderService;
import org.akira.laptopstore.order.service.impl.OrderCheckoutSupport.CheckoutPricing;
import org.akira.laptopstore.order.service.impl.OrderCheckoutSupport.ResolvedShippingAddress;
import org.akira.laptopstore.order.statemachine.OrderStateMachine;
import org.akira.laptopstore.order.util.OrderCodeGenerator;
import org.akira.laptopstore.promotion.dto.response.CouponEvaluation;
import org.akira.laptopstore.promotion.service.CouponService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final OrderMapper orderMapper;
    private final CartService cartService;
    private final CatalogCheckoutService catalogCheckoutService;
    private final InventoryService inventoryService;
    private final CouponService couponService;
    private final OrderCheckoutSupport checkoutSupport;

    @Override
    @Transactional(readOnly = true)
    public CheckoutPreviewResponse previewCheckout(Long userId, CheckoutPreviewRequest request) {
        requireUserId(userId);
        CheckoutPreviewRequest safeRequest = request != null ? request : new CheckoutPreviewRequest();

        CheckoutPaymentMethod paymentMethod = CheckoutPaymentMethod.fromValue(safeRequest.getPaymentMethod());
        ResolvedShippingAddress shipping = checkoutSupport.resolveShippingAddress(
                userId,
                safeRequest.getAddressId(),
                safeRequest.getRecipientName(),
                safeRequest.getRecipientPhone(),
                safeRequest.getShippingAddress(),
                false
        );

        CartResponse cart = cartService.getCart(userId);
        if (cart == null || cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new ValidationException("Giỏ hàng đang trống");
        }

        List<CartSnapshot.Item> cartItems = cart.getItems().stream()
                .map(item -> new CartSnapshot.Item(item.getCartItemId(), item.getVariantId(), item.getQuantity()))
                .toList();

        Map<Long, CheckoutVariantSnapshot> variants = catalogCheckoutService
                .getSellableVariants(cartItems.stream().map(CartSnapshot.Item::getVariantId).toList())
                .stream()
                .collect(Collectors.toMap(CheckoutVariantSnapshot::getVariantId, variant -> variant));

        checkoutSupport.validateStockBeforeOrder(cartItems, variants);

        String requestedCouponCode = checkoutSupport.normalizeUpper(safeRequest.getCouponCode());
        CheckoutPricing pricing = checkoutSupport.evaluatePricing(cartItems, variants, userId, requestedCouponCode);

        List<OrderItemResponse> previewItems = new ArrayList<>(cartItems.size());
        int totalItems = 0;
        for (CartItemResponse item : cart.getItems()) {
            CheckoutVariantSnapshot variant = checkoutSupport.requireVariant(variants, item.getVariantId());
            BigDecimal lineTotal = variant.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            totalItems += item.getQuantity();
            previewItems.add(new OrderItemResponse(
                    null,
                    variant.getProductId(),
                    variant.getVariantId(),
                    variant.getProductName(),
                    variant.getVariantName(),
                    variant.getSku(),
                    variant.getUnitPrice(),
                    item.getQuantity(),
                    lineTotal
            ));
        }

        return CheckoutPreviewResponse.builder()
                .addressId(shipping.addressId())
                .recipientName(shipping.recipientName())
                .recipientPhone(shipping.recipientPhone())
                .shippingAddress(shipping.shippingAddress())
                .paymentMethod(paymentMethod.name())
                .couponCode(pricing.couponCodeSnapshot())
                .subtotal(pricing.subtotal())
                .discountAmount(pricing.discountAmount())
                .shippingFee(pricing.shippingFee())
                .totalAmount(pricing.totalAmount())
                .totalItems(totalItems)
                .items(List.copyOf(previewItems))
                .build();
    }

    @Override
    @Transactional
    public OrderResponse createOrder(Long userId, CreateOrderRequest request) {
        requireUserId(userId);
        if (request == null) {
            throw new ValidationException("Yêu cầu đặt hàng không được để trống");
        }

        // 1. Validate phương thức thanh toán và địa chỉ giao hàng trước khi tạo order.
        CheckoutPaymentMethod paymentMethod = CheckoutPaymentMethod.fromValue(request.getPaymentMethod());
        OrderStatus initialStatus = resolveInitialStatus(paymentMethod);
        ResolvedShippingAddress resolvedShipping = checkoutSupport.resolveShippingAddress(
                userId,
                request.getAddressId(),
                request.getRecipientName(),
                request.getRecipientPhone(),
                request.getShippingAddress(),
                true
        );
        String requestedCouponCode = checkoutSupport.normalizeUpper(request.getCouponCode());

        // 2. Kiểm tra Idempotency-Key chống tạo đơn trùng.
        String idempotencyKey = checkoutSupport.normalize(request.getIdempotencyKey());
        if (idempotencyKey != null) {
            Order previous = orderRepository.findByIdempotencyKeyAndUserId(idempotencyKey, userId).orElse(null);
            if (previous != null) {
                List<OrderStatusHistory> previousHistories =
                        orderStatusHistoryRepository.findByOrderIdOrderByChangedAtDesc(previous.getId());
                if (!sameCheckoutPayload(previous, previousHistories, resolvedShipping, requestedCouponCode, initialStatus)) {
                    log.warn("Xung đột Idempotency-Key={} cho userId={}: thông tin nhận hàng/coupon/thanh toán không khớp đơn cũ orderId={}",
                            idempotencyKey, userId, previous.getId());
                    throw new BusinessException(
                            HttpStatus.CONFLICT,
                            "IDEMPOTENCY_CONFLICT",
                            "Idempotency-Key đã được sử dụng với dữ liệu đặt hàng khác"
                    );
                }

                List<OrderItem> previousItems = orderItemRepository.findByOrderId(previous.getId());
                CartResponse currentCart = cartService.getCart(userId);
                if (!sameCartAndAmountPayload(previous, previousItems, currentCart)) {
                    log.warn("Xung đột Idempotency-Key={} cho userId={}: danh sách sản phẩm, số lượng hoặc giá trị giỏ hàng không khớp đơn cũ orderId={}",
                            idempotencyKey, userId, previous.getId());
                    throw new BusinessException(
                            HttpStatus.CONFLICT,
                            "IDEMPOTENCY_CONFLICT",
                            "Idempotency-Key đã được sử dụng với giỏ hàng hoặc giá trị đơn hàng khác"
                    );
                }

                log.info("Phát hiện yêu cầu đặt hàng lặp với Idempotency-Key={} cho userId={}, trả về đơn cũ orderId={}",
                        idempotencyKey, userId, previous.getId());
                return orderMapper.toResponse(
                        previous,
                        previousItems,
                        previousHistories
                );
            }
        }

        // 3. Khóa cart để dữ liệu checkout không bị thay đổi đồng thời.
        CartSnapshot cart = cartService.lockAndGetCheckoutCart(userId);
        if (cart == null || cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new ValidationException("Giỏ hàng đang trống");
        }

        // 4. Khóa variant theo ID tăng dần, xác minh còn bán và lấy snapshot giá/tồn hiện tại.
        Map<Long, CheckoutVariantSnapshot> variants = catalogCheckoutService
                .lockAndGetSellableVariants(cart.getItems().stream()
                        .map(CartSnapshot.Item::getVariantId)
                        .toList())
                .stream()
                .collect(Collectors.toMap(CheckoutVariantSnapshot::getVariantId, variant -> variant));

        // 5. Validate tồn kho của từng biến thể trước khi tạo order.
        checkoutSupport.validateStockBeforeOrder(cart.getItems(), variants);

        // 6. Tính lại subtotal/discount/shipping/total ở server, validate coupon trước khi tạo order.
        CheckoutPricing pricing = checkoutSupport.evaluatePricing(
                cart.getItems(), variants, userId, requestedCouponCode);

        // 7. Lưu order để có ID cho item, coupon usage, lịch sử trạng thái và lịch sử kho.
        // Nếu có 2 request cùng userId + Idempotency-Key chạy song song vượt qua bước 2,
        // ràng buộc uq_orders_user_idempotency_key ở DB sẽ chặn tại đây -> trả về 409 IDEMPOTENCY_CONFLICT thay vì 500.
        Order pendingOrder = Order.builder()
                .userId(userId)
                .orderCode(OrderCodeGenerator.generate())
                .status(initialStatus)
                .subtotal(pricing.subtotal())
                .discountAmount(pricing.discountAmount())
                .shippingFee(pricing.shippingFee())
                .totalAmount(pricing.totalAmount())
                .recipientName(resolvedShipping.recipientName())
                .recipientPhone(resolvedShipping.recipientPhone())
                .shippingAddress(resolvedShipping.shippingAddress())
                .couponCodeSnapshot(pricing.couponCodeSnapshot())
                .idempotencyKey(idempotencyKey)
                .build();
        Order order;
        try {
            order = orderRepository.saveAndFlush(pendingOrder);
        } catch (DataIntegrityViolationException ex) {
            if (idempotencyKey != null && isUserIdempotencyConstraintViolation(ex)) {
                log.warn("Phát hiện request đặt hàng đồng thời bị trùng (userId={}, Idempotency-Key={}) bởi constraint DB",
                        userId, idempotencyKey);
                throw new BusinessException(
                        HttpStatus.CONFLICT,
                        "IDEMPOTENCY_CONFLICT",
                        "Yêu cầu đặt hàng với Idempotency-Key này đang được xử lý hoặc đã tồn tại"
                );
            }
            throw ex;
        }

        // 8. Khóa và ghi nhận lượt sử dụng coupon gắn với orderId trong cùng transaction.
        if (requestedCouponCode != null) {
            CouponEvaluation reservedEvaluation = couponService.reserveForOrder(
                    requestedCouponCode,
                    userId,
                    order.getId(),
                    pricing.subtotal()
            );
            if (reservedEvaluation != null) {
                BigDecimal reservedDiscount = checkoutSupport.normalizeDiscount(
                        reservedEvaluation.discountAmount(), pricing.subtotal());
                String reservedCode = reservedEvaluation.couponCode() != null
                        ? reservedEvaluation.couponCode().trim().toUpperCase(Locale.ROOT)
                        : requestedCouponCode;
                BigDecimal reservedTotal = checkoutSupport.calculateTotalAmount(
                        pricing.subtotal(), reservedDiscount, pricing.shippingFee());

                if (order.getDiscountAmount().compareTo(reservedDiscount) != 0
                        || order.getTotalAmount().compareTo(reservedTotal) != 0
                        || !Objects.equals(order.getCouponCodeSnapshot(), reservedCode)) {
                    order.setDiscountAmount(reservedDiscount);
                    order.setTotalAmount(reservedTotal);
                    order.setCouponCodeSnapshot(reservedCode);
                    orderRepository.save(order);
                }
            }
        }

        // 9. Lưu snapshot sản phẩm để dữ liệu đơn không đổi khi catalog được cập nhật.
        List<OrderItem> items = cart.getItems().stream().map(cartItem -> {
            CheckoutVariantSnapshot variant = checkoutSupport.requireVariant(variants, cartItem.getVariantId());
            return OrderItem.builder()
                    .order(order)
                    .productId(variant.getProductId())
                    .variantId(variant.getVariantId())
                    .productName(variant.getProductName())
                    .variantName(variant.getVariantName())
                    .sku(variant.getSku())
                    .unitPrice(variant.getUnitPrice())
                    .quantity(cartItem.getQuantity())
                    .build();
        }).toList();
        orderItemRepository.saveAll(items);

        // 10. Đơn mới bắt đầu ở trạng thái initialStatus.
        OrderStatusHistory history = orderStatusHistoryRepository.save(OrderStatusHistory.builder()
                .order(order)
                .toStatus(initialStatus)
                .changedAt(Instant.now())
                .changedByUserId(userId)
                .build());

        // 11. Trừ tồn và ghi stock movement; lỗi sẽ rollback toàn bộ checkout.
        inventoryService.deductForOrder(
                order.getId(),
                userId,
                cart.getItems().stream()
                        .map(item -> new OrderStockDeduction(item.getVariantId(), item.getQuantity()))
                        .toList()
        );

        // 12. Chỉ xóa cart sau khi đã tạo order và trừ tồn thành công.
        cartService.clearPurchasedItems(
                userId,
                cart.getItems().stream().map(CartSnapshot.Item::getCartItemId).toList()
        );

        log.info("Tạo đơn hàng thành công: orderId={}, orderCode={}, userId={}, trạng thái={}, tổng tiền={}",
                order.getId(), order.getOrderCode(), userId, initialStatus, order.getTotalAmount());

        return orderMapper.toResponse(order, items, List.of(history));
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOwnOrder(Long userId, Long orderId) {
        requireUserId(userId);
        requireOrderId(orderId);
        Order order = orderRepository.findById(orderId)
                .filter(candidate -> userId.equals(candidate.getUserId()))
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng không được tìm thấy!"));
        return toDetailResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderSummaryResponse> getOwnOrders(Long userId, Pageable pageable) {
        requireUserId(userId);
        return toSummaryPage(orderRepository.findByUserId(userId, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderSummaryResponse> getAllOrders(Pageable pageable) {
        return toSummaryPage(orderRepository.findAll(pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public OrderDashboardSummaryResponse getDashboardSummary() {
        long totalOrders = 0;
        long pendingCount = 0;
        long inProgressCount = 0;
        long deliveredCount = 0;
        BigDecimal deliveredRevenue = BigDecimal.ZERO;

        for (Object[] row : orderRepository.summarizeByStatus()) {
            OrderStatus status = (OrderStatus) row[0];
            long count = row[1] == null ? 0L : ((Number) row[1]).longValue();
            BigDecimal amount = row[2] == null ? BigDecimal.ZERO : new BigDecimal(row[2].toString());
            totalOrders += count;
            if (status == OrderStatus.CREATED
                    || status == OrderStatus.PENDING_PAYMENT
                    || status == OrderStatus.WAITING_CONFIRMATION) {
                pendingCount += count;
            } else if (status == OrderStatus.CONFIRMED
                    || status == OrderStatus.PACKING
                    || status == OrderStatus.SHIPPING) {
                inProgressCount += count;
            } else if (status == OrderStatus.DELIVERED) {
                deliveredCount += count;
                deliveredRevenue = deliveredRevenue.add(amount);
            }
        }

        return OrderDashboardSummaryResponse.builder()
                .totalOrders(totalOrders)
                .pendingCount(pendingCount)
                .inProgressCount(inProgressCount)
                .deliveredCount(deliveredCount)
                .deliveredRevenue(deliveredRevenue)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getStaffOrder(Long orderId) {
        requireOrderId(orderId);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));
        return toDetailResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(Long actorId, Long orderId, UpdateOrderStatusRequest request) {
        requireUserId(actorId);
        requireOrderId(orderId);
        if (request == null || request.getStatus() == null) {
            throw new ValidationException("Trạng thái đơn hàng không được để trống");
        }

        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng: " + orderId));

        OrderStatus currentStatus = order.getStatus();
        OrderStatus targetStatus = request.getStatus();

        // Lệnh cập nhật lặp lại cùng trạng thái: trả về kết quả hiện tại, không ghi thêm lịch sử hay hoàn kho/coupon lần hai.
        if (currentStatus == targetStatus) {
            return toDetailResponse(order);
        }
        if (currentStatus == OrderStatus.PENDING_PAYMENT && targetStatus == OrderStatus.CONFIRMED) {
            throw new ValidationException("Đơn online phải được xác nhận qua kết quả thanh toán");
        }

        int deliveryAttempts = (int) orderStatusHistoryRepository.findByOrderIdOrderByChangedAtDesc(orderId).stream()
                .filter(h -> h.getToStatus() == OrderStatus.DELIVERY_FAILED)
                .count();

        OrderStateMachine.validateTransition(currentStatus, targetStatus, true, deliveryAttempts);

        order.setStatus(targetStatus);
        orderRepository.save(order);

        orderStatusHistoryRepository.save(OrderStatusHistory.builder()
                .order(order)
                .fromStatus(currentStatus)
                .toStatus(targetStatus)
                .changedAt(Instant.now())
                .changedByUserId(actorId)
                .build());

        if (targetStatus == OrderStatus.CANCELLED || targetStatus == OrderStatus.RETURNED) {
            handleOrderCancellationSideEffects(order, actorId);
        }

        log.info("Cập nhật trạng thái đơn hàng thành công: orderId={}, từ [{}] sang [{}], actorId={}",
                orderId, currentStatus, targetStatus, actorId);

        return toDetailResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(Long userId, Long orderId, String reason) {
        requireUserId(userId);
        requireOrderId(orderId);

        Order order = orderRepository.findByIdForUpdate(orderId)
                .filter(candidate -> userId.equals(candidate.getUserId()))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng"));

        OrderStatus currentStatus = order.getStatus();

        if (currentStatus == OrderStatus.CANCELLED) {
            log.info("Đơn hàng đã ở trạng thái CANCELLED trước đó: orderId={}, userId={}, bỏ qua xử lý lặp",
                    orderId, userId);
            return toDetailResponse(order);
        }
        OrderStateMachine.validateTransition(currentStatus, OrderStatus.CANCELLED, false, 0);

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);

        orderStatusHistoryRepository.save(OrderStatusHistory.builder()
                .order(order)
                .fromStatus(currentStatus)
                .toStatus(OrderStatus.CANCELLED)
                .changedAt(Instant.now())
                .changedByUserId(userId)
                .build());

        handleOrderCancellationSideEffects(order, userId);

        log.info("Khách hàng đã hủy đơn hàng: orderId={}, từ [{}] sang [CANCELLED], userId={}, lý do={}",
                orderId, currentStatus, userId, checkoutSupport.normalize(reason));

        return toDetailResponse(order);
    }

    @Override
    @Transactional
    public int expirePendingOrders(Duration timeout) {
        if (timeout == null || timeout.isNegative() || timeout.isZero()) {
            timeout = Duration.ofMinutes(15);
        }
        Instant cutoffTime = Instant.now().minus(timeout);
        List<Order> expiredOrders = orderRepository.findByStatusAndCreatedAtBefore(OrderStatus.PENDING_PAYMENT, cutoffTime);
        int count = 0;

        for (Order order : expiredOrders) {
            order.setStatus(OrderStatus.CANCELLED);
            orderRepository.save(order);
            orderStatusHistoryRepository.save(OrderStatusHistory.builder()
                    .order(order).fromStatus(OrderStatus.PENDING_PAYMENT).toStatus(OrderStatus.CANCELLED)
                    .changedAt(Instant.now()).changedByUserId(null).build());
            // Không nuốt lỗi: trạng thái, lịch sử, tồn kho và coupon phải rollback cùng nhau trong một transaction.
            handleOrderCancellationSideEffects(order, null);
            count++;
        }

        if (count > 0) {
            log.info("Đã tự động hủy {} đơn hàng chờ thanh toán online quá hạn (tạo trước {})", count, cutoffTime);
        }

        return count;
    }

    @Override
    @Transactional
    public int expirePendingOrders() {
        return expirePendingOrders(Duration.ofMinutes(15));
    }

    private Page<OrderSummaryResponse> toSummaryPage(Page<Order> orderPage) {
        if (orderPage.isEmpty()) {
            return orderPage.map(order -> orderMapper.toSummaryResponse(order, 0));
        }

        List<Long> orderIds = orderPage.getContent().stream()
                .map(Order::getId)
                .toList();
        Map<Long, Integer> totalItemsByOrderId = new HashMap<>(orderIds.size());
        for (Object[] row : orderItemRepository.sumQuantitiesByOrderIds(orderIds)) {
            Long id = ((Number) row[0]).longValue();
            int total = row[1] == null ? 0 : ((Number) row[1]).intValue();
            totalItemsByOrderId.put(id, total);
        }

        return orderPage.map(order ->
                orderMapper.toSummaryResponse(order, totalItemsByOrderId.getOrDefault(order.getId(), 0)));
    }

    private OrderResponse toDetailResponse(Order order) {
        return orderMapper.toResponse(
                order,
                orderItemRepository.findByOrderId(order.getId()),
                orderStatusHistoryRepository.findByOrderIdOrderByChangedAtDesc(order.getId())
        );
    }

    private void handleOrderCancellationSideEffects(Order order, Long actorId) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        List<OrderStockDeduction> lines = items.stream()
                .map(item -> new OrderStockDeduction(item.getVariantId(), item.getQuantity()))
                .toList();

        if (!lines.isEmpty()) {
            inventoryService.restoreForOrder(order.getId(), actorId, lines);
        }

        if (order.getCouponCodeSnapshot() != null) {
            couponService.releaseForOrder(order.getId());
        }
    }

    private OrderStatus resolveInitialStatus(CheckoutPaymentMethod paymentMethod) {
        return paymentMethod == CheckoutPaymentMethod.VNPAY
                ? OrderStatus.PENDING_PAYMENT
                : OrderStatus.WAITING_CONFIRMATION;
    }

    // Hàm này được dùng để kiểm tra tính Idempotency, xem 1 yêu cầu đặt hàng có bị gửi nhiều lần không
    private boolean sameCheckoutPayload(
            Order order,
            List<OrderStatusHistory> histories,
            ResolvedShippingAddress resolvedShipping,
            String requestedCouponCode,
            OrderStatus expectedInitialStatus
    ) {
        OrderStatus originalInitialStatus = histories.stream()
                .filter(h -> h.getFromStatus() == null)
                .map(OrderStatusHistory::getToStatus)
                .findFirst()
                .orElse(order.getStatus());

        return Objects.equals(order.getRecipientName(), resolvedShipping.recipientName())
                && Objects.equals(order.getRecipientPhone(), resolvedShipping.recipientPhone())
                && Objects.equals(order.getShippingAddress(), resolvedShipping.shippingAddress())
                && Objects.equals(checkoutSupport.normalizeUpper(order.getCouponCodeSnapshot()), requestedCouponCode)
                && originalInitialStatus == expectedInitialStatus;
    }

    /**
     * Đối chiếu giỏ hàng hiện tại với các dòng hàng và tổng tiền của đơn cũ khi phát hiện trùng Idempotency-Key.
     * - Nếu giỏ hiện tại đang rỗng: lần checkout trước đã xóa giỏ sau khi commit thành công (bước 12),
     *   nên đây là retry hợp lệ do lỗi mạng -> cho phép trả lại đơn cũ.
     * - Nếu giỏ hiện tại còn sản phẩm: bắt buộc phải khớp toàn bộ biến thể, số lượng, đơn giá từng biến thể
     *   và tổng tạm tính (subtotal) của đơn cũ; nếu lệch sẽ báo 409 IDEMPOTENCY_CONFLICT.
     */
    private boolean sameCartAndAmountPayload(
            Order previous,
            List<OrderItem> previousItems,
            CartResponse currentCart
    ) {
        if (currentCart == null || currentCart.getItems() == null || currentCart.getItems().isEmpty()) {
            return true;
        }
        if (previousItems == null || previousItems.isEmpty()) {
            return false;
        }

        // 1. Gom số lượng và đơn giá theo từng variantId từ đơn hàng đã tạo trước đó.
        Map<Long, Integer> previousQtyByVariant = new HashMap<>();
        Map<Long, BigDecimal> previousPriceByVariant = new HashMap<>();
        for (OrderItem item : previousItems) {
            previousQtyByVariant.merge(item.getVariantId(), item.getQuantity(), Integer::sum);
            previousPriceByVariant.putIfAbsent(item.getVariantId(), item.getUnitPrice());
        }

        // 2. Gom số lượng theo từng variantId và tính lại tổng tạm tính từ giỏ hàng hiện tại.
        Map<Long, Integer> currentQtyByVariant = new HashMap<>();
        BigDecimal currentSubtotal = BigDecimal.ZERO;
        for (CartItemResponse item : currentCart.getItems()) {
            if (item.getVariantId() == null || item.getQuantity() == null || item.getUnitPrice() == null) {
                return false;
            }
            BigDecimal previousUnitPrice = previousPriceByVariant.get(item.getVariantId());
            if (previousUnitPrice == null || previousUnitPrice.compareTo(item.getUnitPrice()) != 0) {
                return false;
            }
            currentQtyByVariant.merge(item.getVariantId(), item.getQuantity(), Integer::sum);
            currentSubtotal = currentSubtotal.add(
                    item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()))
            );
        }

        // 3. Kiểm tra khớp hoàn toàn tập biến thể + số lượng và giá trị tạm tính của đơn hàng.
        if (!Objects.equals(previousQtyByVariant, currentQtyByVariant)) {
            return false;
        }
        return previous.getSubtotal() != null && previous.getSubtotal().compareTo(currentSubtotal) == 0;
    }

    private boolean isUserIdempotencyConstraintViolation(DataIntegrityViolationException ex) {
        Throwable cursor = ex;
        while (cursor != null) {
            String message = cursor.getMessage();
            if (message != null) {
                String lower = message.toLowerCase(Locale.ROOT);
                if (lower.contains("uq_orders_user_idempotency_key")
                        || lower.contains("uq_orders_idempotency_key")
                        || lower.contains("orders_idempotency_key_key")) {
                    return true; // Lỗi này do lỗi của khóa trùng
                }
            }
            cursor = cursor.getCause();
        }
        return false; // Lỗi do nguyên nhân khác. VD: trùng mã đơn hàng, vi phạm khóa ngoại, sai kiểu dữ liệu
    }

    private void requireUserId(Long userId) {
        if (userId == null || userId <= 0) {
            throw new UnauthenticatedException("Thông tin người dùng đăng nhập không hợp lệ");
        }
    }

    private void requireOrderId(Long orderId) {
        if (orderId == null || orderId <= 0) {
            throw new ValidationException("Mã đơn hàng (orderId) phải lớn hơn 0");
        }
    }
}
