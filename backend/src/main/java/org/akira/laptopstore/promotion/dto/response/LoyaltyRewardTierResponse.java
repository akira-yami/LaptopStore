package org.akira.laptopstore.promotion.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.akira.laptopstore.promotion.enums.DiscountType;

import java.math.BigDecimal;

@Getter
@Builder
public class LoyaltyRewardTierResponse {

    private String tierCode;
    private String title;
    private int pointsCost;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal minOrderAmount;
    private int validDays;
    private String description;
}
