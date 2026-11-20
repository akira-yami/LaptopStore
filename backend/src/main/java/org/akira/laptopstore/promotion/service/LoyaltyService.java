package org.akira.laptopstore.promotion.service;

import org.akira.laptopstore.promotion.dto.request.RedeemLoyaltyCouponRequest;
import org.akira.laptopstore.promotion.dto.response.LoyaltyOverviewResponse;
import org.akira.laptopstore.promotion.dto.response.LoyaltyRedeemResponse;

import java.math.BigDecimal;

public interface LoyaltyService {

    LoyaltyOverviewResponse getMyLoyaltyOverview(Long userId);

    LoyaltyRedeemResponse redeemPointsForCoupon(Long userId, RedeemLoyaltyCouponRequest request);

    void awardPointsForDeliveredOrder(Long userId, Long orderId, String orderCode, BigDecimal totalAmount);
}
