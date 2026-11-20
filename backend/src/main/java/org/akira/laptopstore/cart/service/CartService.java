package org.akira.laptopstore.cart.service;

import org.akira.laptopstore.cart.dto.request.AddCartItemRequest;
import org.akira.laptopstore.cart.dto.request.UpdateCartItemRequest;
import org.akira.laptopstore.cart.dto.response.CartResponse;
import org.akira.laptopstore.cart.dto.response.CartSnapshot;

import java.util.Collection;

public interface CartService {
    CartResponse getCart(Long userId);

    CartResponse addItemToCart(Long userId, AddCartItemRequest request);

    CartResponse updateCartItem(Long userId, Long cartItemId, UpdateCartItemRequest request);

    void removeCartItem(Long userId, Long cartItemId);

    void clearCart(Long userId);

    // Method nay dc dung de phuc vu checkout
    CartSnapshot lockAndGetCheckoutCart(Long userId);

    // Cho phép checkout chọn mua một phần giỏ hàng theo danh sách cartItemId
    CartSnapshot lockAndGetCheckoutCart(Long userId, Collection<Long> selectedCartItemIds);

    void clearPurchasedItems(Long userId, Collection<Long> cartItemIds);
}
