package org.akira.laptopstore.promotion.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.akira.laptopstore.promotion.enums.DiscountType;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Builder
public class AvailableCouponResponse {

    private Long id;
    private String code;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal maxDiscount;
    private BigDecimal minOrderAmount;
    private Integer usageLimit;
    private Integer usagePerUser;
    private Integer remainingTotalUses;
    private Integer remainingUserUses;
    private Instant startsAt;
    private Instant endsAt;
    private boolean personal;
}
