package org.akira.laptopstore.order.service.impl;

import lombok.RequiredArgsConstructor;
import org.akira.laptopstore.cart.dto.response.CartSnapshot;
import org.akira.laptopstore.catalog.dto.response.CheckoutVariantSnapshot;
import org.akira.laptopstore.exception.ResourceNotFoundException;
import org.akira.laptopstore.exception.ValidationException;
import org.akira.laptopstore.promotion.dto.response.CouponEvaluation;
import org.akira.laptopstore.promotion.service.CouponService;
import org.akira.laptopstore.user.dto.AddressResponse;
import org.akira.laptopstore.user.service.AddressService;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * Helper nội bộ dùng chung cho luồng xem trước và tạo đơn checkout:
 * giải quyết địa chỉ giao hàng, kiểm tra tồn kho và tính toán tiền tệ/khuyến mãi.
 */
@Component
@RequiredArgsConstructor
public class OrderCheckoutSupport {

    private final AddressService addressService;
    private final CouponService couponService;

    ResolvedShippingAddress resolveShippingAddress(
            Long userId,
            Long addressId,
            String rawRecipientName,
            String rawRecipientPhone,
            String rawShippingAddress,
            boolean required
    ) {
        if (addressId != null) {
            if (addressId <= 0) {
                throw new ValidationException("Mã địa chỉ (addressId) phải lớn hơn 0");
            }
            if (addressService == null) {
                throw new IllegalStateException("AddressService chưa được cấu hình");
            }
            AddressResponse ownedAddress = addressService.getAddressById(userId, addressId);
            String recipientName = !isBlank(rawRecipientName)
                    ? rawRecipientName.trim()
                    : Objects.toString(ownedAddress.getRecipientName(), "").trim();
            String recipientPhone = !isBlank(rawRecipientPhone)
                    ? rawRecipientPhone.trim()
                    : Objects.toString(ownedAddress.getPhone(), "").trim();
            String shippingAddress = !isBlank(rawShippingAddress)
                    ? rawShippingAddress.trim()
                    : formatAddress(ownedAddress);
            if (required) {
                validateShippingStrings(recipientName, recipientPhone, shippingAddress);
            }
            return new ResolvedShippingAddress(addressId, recipientName, recipientPhone, shippingAddress);
        }

        if (!required) {
            return new ResolvedShippingAddress(
                    null,
                    normalize(rawRecipientName),
                    normalize(rawRecipientPhone),
                    normalize(rawShippingAddress)
            );
        }

        if (isBlank(rawRecipientName) || isBlank(rawRecipientPhone) || isBlank(rawShippingAddress)) {
            throw new ValidationException("Vui lòng nhập đầy đủ tên người nhận, số điện thoại và địa chỉ giao hàng");
        }
        String recipientName = rawRecipientName.trim();
        String recipientPhone = rawRecipientPhone.trim();
        String shippingAddress = rawShippingAddress.trim();
        validateShippingStrings(recipientName, recipientPhone, shippingAddress);
        return new ResolvedShippingAddress(null, recipientName, recipientPhone, shippingAddress);
    }

    void validateStockBeforeOrder(
            List<CartSnapshot.Item> cartItems,
            Map<Long, CheckoutVariantSnapshot> variants
    ) {
        Map<Long, Integer> requestedByVariant = new LinkedHashMap<>();
        for (CartSnapshot.Item item : cartItems) {
            if (item == null || item.getVariantId() == null || item.getVariantId() <= 0
                    || item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new ValidationException("Sản phẩm trong giỏ phải có variantId và số lượng lớn hơn 0");
            }
            CheckoutVariantSnapshot variant = requireVariant(variants, item.getVariantId());
            if (variant.getUnitPrice() == null || variant.getUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new ValidationException("Đơn giá không hợp lệ cho biến thể sản phẩm: " + item.getVariantId());
            }
            int updatedQty = Math.addExact(
                    requestedByVariant.getOrDefault(item.getVariantId(), 0),
                    item.getQuantity()
            );
            requestedByVariant.put(item.getVariantId(), updatedQty);
        }

        for (Map.Entry<Long, Integer> entry : requestedByVariant.entrySet()) {
            CheckoutVariantSnapshot variant = requireVariant(variants, entry.getKey());
            if (variant.getAvailableQuantity() != null && entry.getValue() > variant.getAvailableQuantity()) {
                throw new ValidationException("Không đủ tồn kho cho biến thể sản phẩm: " + entry.getKey());
            }
        }
    }

    CheckoutPricing evaluatePricing(
            List<CartSnapshot.Item> cartItems,
            Map<Long, CheckoutVariantSnapshot> variants,
            Long userId,
            String requestedCouponCode
    ) {
        BigDecimal subtotal = calculateSubtotal(cartItems, variants);
        BigDecimal shippingFee = calculateShippingFee(subtotal);
        BigDecimal discount = BigDecimal.ZERO;
        String couponCodeSnapshot = null;

        if (requestedCouponCode != null) {
            if (couponService == null) {
                throw new ValidationException("Chức năng áp dụng mã giảm giá hiện chưa khả dụng");
            }
            CouponEvaluation evaluation = couponService.evaluateForCheckout(requestedCouponCode, userId, subtotal);
            if (evaluation != null) {
                discount = normalizeDiscount(evaluation.discountAmount(), subtotal);
                couponCodeSnapshot = evaluation.couponCode() != null
                        ? evaluation.couponCode().trim().toUpperCase(Locale.ROOT)
                        : requestedCouponCode;
            }
        }

        BigDecimal totalAmount = calculateTotalAmount(subtotal, discount, shippingFee);
        return new CheckoutPricing(subtotal, discount, shippingFee, totalAmount, couponCodeSnapshot);
    }

    BigDecimal normalizeDiscount(BigDecimal rawDiscount, BigDecimal subtotal) {
        if (rawDiscount == null || rawDiscount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        if (rawDiscount.compareTo(subtotal) > 0) {
            return subtotal;
        }
        return rawDiscount;
    }

    BigDecimal calculateTotalAmount(BigDecimal subtotal, BigDecimal discount, BigDecimal shippingFee) {
        BigDecimal total = subtotal.subtract(discount).add(shippingFee);
        if (total.compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Tổng tiền đơn hàng không được âm");
        }
        return total;
    }

    CheckoutVariantSnapshot requireVariant(Map<Long, CheckoutVariantSnapshot> variants, Long variantId) {
        CheckoutVariantSnapshot variant = variants.get(variantId);
        if (variant == null) {
            throw new ResourceNotFoundException("Không tìm thấy biến thể sản phẩm: " + variantId);
        }
        return variant;
    }

    String normalize(String value) {
        return isBlank(value) ? null : value.trim();
    }

    String normalizeUpper(String value) {
        return isBlank(value) ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private BigDecimal calculateSubtotal(
            List<CartSnapshot.Item> cartItems,
            Map<Long, CheckoutVariantSnapshot> variants
    ) {
        return cartItems.stream()
                .map(item -> requireVariant(variants, item.getVariantId())
                        .getUnitPrice()
                        .multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateShippingFee(BigDecimal subtotal) {
        return BigDecimal.ZERO;
    }

    private void validateShippingStrings(String recipientName, String recipientPhone, String shippingAddress) {
        if (isBlank(recipientName) || isBlank(recipientPhone) || isBlank(shippingAddress)) {
            throw new ValidationException("Vui lòng nhập đầy đủ tên người nhận, số điện thoại và địa chỉ giao hàng");
        }
        if (recipientName.length() > 100) {
            throw new ValidationException("Tên người nhận không được vượt quá 100 ký tự");
        }
        if (recipientPhone.length() > 20) {
            throw new ValidationException("Số điện thoại người nhận không được vượt quá 20 ký tự");
        }
    }

    private String formatAddress(AddressResponse address) {
        List<String> parts = new ArrayList<>(5);
        if (!isBlank(address.getStreet())) {
            parts.add(address.getStreet().trim());
        }
        if (!isBlank(address.getWard())) {
            parts.add(address.getWard().trim());
        }
        if (!isBlank(address.getDistrict())) {
            parts.add(address.getDistrict().trim());
        }
        if (!isBlank(address.getCity())) {
            parts.add(address.getCity().trim());
        }
        if (!isBlank(address.getPostalCode())) {
            parts.add(address.getPostalCode().trim());
        }
        return String.join(", ", parts);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    record ResolvedShippingAddress(
            Long addressId,
            String recipientName,
            String recipientPhone,
            String shippingAddress
    ) {
    }

    record CheckoutPricing(
            BigDecimal subtotal,
            BigDecimal discountAmount,
            BigDecimal shippingFee,
            BigDecimal totalAmount,
            String couponCodeSnapshot
    ) {
    }
}
