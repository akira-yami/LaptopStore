package org.akira.laptopstore.promotion.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
public class LoyaltyOverviewResponse {

    private int pointsBalance;
    private int totalEarned;
    private int totalRedeemed;
    private BigDecimal vndPerPoint;
    private List<LoyaltyRewardTierResponse> rewardTiers;
    private List<LoyaltyTransactionResponse> transactions;
    private List<AvailableCouponResponse> availableCoupons;
}
