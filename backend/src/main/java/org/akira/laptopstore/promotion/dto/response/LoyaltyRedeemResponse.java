package org.akira.laptopstore.promotion.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoyaltyRedeemResponse {

    private AvailableCouponResponse coupon;
    private int pointsBalance;
    private int totalRedeemed;
    private String message;
}
