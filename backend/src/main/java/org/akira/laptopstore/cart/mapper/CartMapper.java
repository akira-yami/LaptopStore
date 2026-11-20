package org.akira.laptopstore.cart.mapper;

import org.akira.laptopstore.cart.dto.response.CartItemResponse;
import org.akira.laptopstore.cart.dto.response.CartResponse;
import org.akira.laptopstore.cart.entity.Cart;
import org.akira.laptopstore.catalog.dto.response.CartVariantSnapshot;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public final class CartMapper {
    private CartMapper() {
    }

    public static CartResponse toResponse(Cart cart, Map<Long, CartVariantSnapshot> variantsById) {
        List<CartItemResponse> itemResponses = cart.getItems().stream()
                .map(item -> {
                    CartVariantSnapshot variant = variantsById.get(item.getVariantId());
                    // Nếu biến thể đã bị xóa khỏi catalog, không làm crash cả giỏ hàng:
                    // đánh dấu sellable = false, availableStock = 0 để khách vẫn mở được giỏ và xóa dòng lỗi.
                    if (variant == null) {
                        return new CartItemResponse(
                                item.getId(),
                                null,
                                item.getVariantId(),
                                "Sản phẩm không còn tồn tại",
                                "",
                                "",
                                null,
                                item.getQuantity(),
                                0,
                                false,
                                BigDecimal.ZERO,
                                BigDecimal.ZERO
                        );
                    }
                    String productName = variant.getProductName();
                    String variantName = variant.getVariantName();
                    BigDecimal unitPrice = variant.getUnitPrice();
                    BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(item.getQuantity()));
                    return new CartItemResponse(
                            item.getId(),
                            variant.getProductId(),
                            item.getVariantId(),
                            productName,
                            variant.getSku(),
                            variantName,
                            variant.getThumbnailImage(),
                            item.getQuantity(),
                            variant.getQuantity(),
                            variant.isSellable(),
                            unitPrice,
                            lineTotal
                    );
                }).toList();
        int totalItems = itemResponses.stream()
                .mapToInt(CartItemResponse::getQuantity)
                .sum();
        BigDecimal totalAmount = itemResponses.stream()
                .map(CartItemResponse::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CartResponse(
                cart.getId(),
                itemResponses,
                totalItems,
                totalAmount
        );
    }
}
