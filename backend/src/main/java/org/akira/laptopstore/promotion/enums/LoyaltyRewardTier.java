package org.akira.laptopstore.promotion.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Optional;

@Getter
@RequiredArgsConstructor
public enum LoyaltyRewardTier {
    COUPON_50K(
            "COUPON_50K",
            "Voucher giảm 50.000 ₫",
            50,
            DiscountType.FIXED,
            new BigDecimal("50000"),
            new BigDecimal("500000"),
            30,
            "Giảm 50.000 ₫ cho đơn hàng từ 500.000 ₫ (Hiệu lực 30 ngày)"
    ),
    COUPON_120K(
            "COUPON_120K",
            "Voucher giảm 120.000 ₫",
            100,
            DiscountType.FIXED,
            new BigDecimal("120000"),
            new BigDecimal("1000000"),
            30,
            "Giảm 120.000 ₫ cho đơn hàng từ 1.000.000 ₫ (Hiệu lực 30 ngày)"
    ),
    COUPON_300K(
            "COUPON_300K",
            "Voucher giảm 300.000 ₫",
            200,
            DiscountType.FIXED,
            new BigDecimal("300000"),
            new BigDecimal("2000000"),
            30,
            "Giảm 300.000 ₫ cho đơn hàng từ 2.000.000 ₫ (Hiệu lực 30 ngày)"
    ),
    COUPON_800K(
            "COUPON_800K",
            "Voucher giảm 800.000 ₫",
            500,
            DiscountType.FIXED,
            new BigDecimal("800000"),
            new BigDecimal("5000000"),
            30,
            "Giảm 800.000 ₫ cho đơn hàng từ 5.000.000 ₫ (Hiệu lực 30 ngày)"
    );

    private final String tierCode;
    private final String title;
    private final int pointsCost;
    private final DiscountType discountType;
    private final BigDecimal discountValue;
    private final BigDecimal minOrderAmount;
    private final int validDays;
    private final String description;

    public static Optional<LoyaltyRewardTier> fromCode(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        String normalized = code.trim();
        return Arrays.stream(values())
                .filter(tier -> tier.tierCode.equalsIgnoreCase(normalized))
                .findFirst();
    }
}
