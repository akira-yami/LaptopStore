package org.akira.laptopstore.promotion.service.Impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.akira.laptopstore.exception.UnauthenticatedException;
import org.akira.laptopstore.exception.ValidationException;
import org.akira.laptopstore.promotion.dto.request.RedeemLoyaltyCouponRequest;
import org.akira.laptopstore.promotion.dto.response.AvailableCouponResponse;
import org.akira.laptopstore.promotion.dto.response.LoyaltyOverviewResponse;
import org.akira.laptopstore.promotion.dto.response.LoyaltyRedeemResponse;
import org.akira.laptopstore.promotion.dto.response.LoyaltyRewardTierResponse;
import org.akira.laptopstore.promotion.dto.response.LoyaltyTransactionResponse;
import org.akira.laptopstore.promotion.entity.Coupon;
import org.akira.laptopstore.promotion.entity.LoyaltyAccount;
import org.akira.laptopstore.promotion.entity.LoyaltyTransaction;
import org.akira.laptopstore.promotion.enums.LoyaltyRewardTier;
import org.akira.laptopstore.promotion.enums.LoyaltyTransactionType;
import org.akira.laptopstore.promotion.repository.CouponRepository;
import org.akira.laptopstore.promotion.repository.LoyaltyAccountRepository;
import org.akira.laptopstore.promotion.repository.LoyaltyTransactionRepository;
import org.akira.laptopstore.promotion.service.CouponService;
import org.akira.laptopstore.promotion.service.LoyaltyService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoyaltyServiceImpl implements LoyaltyService {

    public static final BigDecimal VND_PER_POINT = new BigDecimal("100000");
    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final LoyaltyTransactionRepository loyaltyTransactionRepository;
    private final CouponRepository couponRepository;
    private final CouponService couponService;

    @Override
    @Transactional(readOnly = true)
    public LoyaltyOverviewResponse getMyLoyaltyOverview(Long userId) {
        requireUserId(userId);

        LoyaltyAccount account = loyaltyAccountRepository.findByUserId(userId).orElse(null);
        int pointsBalance = account != null && account.getPointsBalance() != null ? account.getPointsBalance() : 0;
        int totalEarned = account != null && account.getTotalEarned() != null ? account.getTotalEarned() : 0;
        int totalRedeemed = account != null && account.getTotalRedeemed() != null ? account.getTotalRedeemed() : 0;

        List<LoyaltyRewardTierResponse> tiers = Arrays.stream(LoyaltyRewardTier.values())
                .map(tier -> LoyaltyRewardTierResponse.builder()
                        .tierCode(tier.getTierCode())
                        .title(tier.getTitle())
                        .pointsCost(tier.getPointsCost())
                        .discountType(tier.getDiscountType())
                        .discountValue(tier.getDiscountValue())
                        .minOrderAmount(tier.getMinOrderAmount())
                        .validDays(tier.getValidDays())
                        .description(tier.getDescription())
                        .build())
                .toList();

        List<LoyaltyTransactionResponse> transactions = loyaltyTransactionRepository
                .findByUserIdOrderByCreatedAtDescIdDesc(userId)
                .stream()
                .map(this::toTransactionResponse)
                .toList();

        List<AvailableCouponResponse> availableCoupons = couponService.getAvailableCouponsForUser(userId);

        return LoyaltyOverviewResponse.builder()
                .pointsBalance(pointsBalance)
                .totalEarned(totalEarned)
                .totalRedeemed(totalRedeemed)
                .vndPerPoint(VND_PER_POINT)
                .rewardTiers(tiers)
                .transactions(transactions)
                .availableCoupons(availableCoupons)
                .build();
    }

    @Override
    @Transactional
    public LoyaltyRedeemResponse redeemPointsForCoupon(Long userId, RedeemLoyaltyCouponRequest request) {
        requireUserId(userId);
        if (request == null || request.getTierCode() == null || request.getTierCode().isBlank()) {
            throw new ValidationException("Vui lòng chọn gói đổi điểm Loyalty");
        }

        LoyaltyRewardTier tier = LoyaltyRewardTier.fromCode(request.getTierCode())
                .orElseThrow(() -> new ValidationException("Gói đổi điểm không hợp lệ"));

        LoyaltyAccount account = loyaltyAccountRepository.findByUserIdForUpdate(userId)
                .orElse(null);
        int currentBalance = account != null && account.getPointsBalance() != null ? account.getPointsBalance() : 0;
        if (account == null || currentBalance < tier.getPointsCost()) {
            throw new ValidationException("Số dư điểm Loyalty không đủ để đổi voucher này");
        }

        Instant now = Instant.now();
        Instant endsAt = now.plus(Duration.ofDays(tier.getValidDays()));
        String generatedCode = generateUniqueLoyaltyCouponCode(tier.getPointsCost());

        Coupon coupon = Coupon.builder()
                .code(generatedCode)
                .ownerUserId(userId)
                .discountType(tier.getDiscountType())
                .discountValue(tier.getDiscountValue())
                .maxDiscount(null)
                .minOrderAmount(tier.getMinOrderAmount())
                .usageLimit(1)
                .usagePerUser(1)
                .startsAt(now)
                .endsAt(endsAt)
                .active(true)
                .build();
        Coupon savedCoupon = couponRepository.save(coupon);

        int newBalance = currentBalance - tier.getPointsCost();
        int newTotalRedeemed = (account.getTotalRedeemed() != null ? account.getTotalRedeemed() : 0)
                + tier.getPointsCost();
        account.setPointsBalance(newBalance);
        account.setTotalRedeemed(newTotalRedeemed);
        loyaltyAccountRepository.save(account);

        LoyaltyTransaction tx = LoyaltyTransaction.builder()
                .userId(userId)
                .type(LoyaltyTransactionType.REDEEM_COUPON)
                .pointsDelta(-tier.getPointsCost())
                .balanceAfter(newBalance)
                .referenceType("COUPON")
                .referenceId(savedCoupon.getCode())
                .operationKey("REDEEM_COUPON_" + savedCoupon.getCode())
                .description("Đổi " + tier.getPointsCost() + " điểm lấy mã " + savedCoupon.getCode()
                        + " (" + tier.getTitle() + ")")
                .createdAt(now)
                .build();
        loyaltyTransactionRepository.save(tx);

        AvailableCouponResponse couponResponse = AvailableCouponResponse.builder()
                .id(savedCoupon.getId())
                .code(savedCoupon.getCode())
                .discountType(savedCoupon.getDiscountType())
                .discountValue(savedCoupon.getDiscountValue())
                .maxDiscount(savedCoupon.getMaxDiscount())
                .minOrderAmount(savedCoupon.getMinOrderAmount())
                .usageLimit(savedCoupon.getUsageLimit())
                .usagePerUser(savedCoupon.getUsagePerUser())
                .remainingTotalUses(1)
                .remainingUserUses(1)
                .startsAt(savedCoupon.getStartsAt())
                .endsAt(savedCoupon.getEndsAt())
                .personal(true)
                .build();

        return LoyaltyRedeemResponse.builder()
                .coupon(couponResponse)
                .pointsBalance(newBalance)
                .totalRedeemed(newTotalRedeemed)
                .message("Đổi điểm thành công! Mã coupon của bạn là " + savedCoupon.getCode())
                .build();
    }

    @Override
    @Transactional
    public void awardPointsForDeliveredOrder(Long userId, Long orderId, String orderCode, BigDecimal totalAmount) {
        if (userId == null || userId <= 0 || orderId == null || orderId <= 0) {
            return;
        }
        if (totalAmount == null || totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        String operationKey = "EARN_ORDER_" + orderId;
        if (loyaltyTransactionRepository.existsByOperationKey(operationKey)) {
            return;
        }

        int earnedPoints = totalAmount.divideToIntegralValue(VND_PER_POINT).intValue();
        if (earnedPoints <= 0) {
            earnedPoints = 1;
        }

        LoyaltyAccount account = loyaltyAccountRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> LoyaltyAccount.builder()
                        .userId(userId)
                        .pointsBalance(0)
                        .totalEarned(0)
                        .totalRedeemed(0)
                        .build());

        int currentBalance = account.getPointsBalance() != null ? account.getPointsBalance() : 0;
        int currentEarned = account.getTotalEarned() != null ? account.getTotalEarned() : 0;
        int newBalance = currentBalance + earnedPoints;
        account.setPointsBalance(newBalance);
        account.setTotalEarned(currentEarned + earnedPoints);
        if (account.getTotalRedeemed() == null) {
            account.setTotalRedeemed(0);
        }
        loyaltyAccountRepository.save(account);

        String displayOrderRef = (orderCode != null && !orderCode.isBlank())
                ? orderCode.trim()
                : String.valueOf(orderId);
        LoyaltyTransaction tx = LoyaltyTransaction.builder()
                .userId(userId)
                .type(LoyaltyTransactionType.EARN_ORDER)
                .pointsDelta(earnedPoints)
                .balanceAfter(newBalance)
                .referenceType("ORDER")
                .referenceId(displayOrderRef)
                .operationKey(operationKey)
                .description("Tích điểm từ đơn hàng #" + displayOrderRef)
                .createdAt(Instant.now())
                .build();
        loyaltyTransactionRepository.save(tx);

        log.info("Đã cộng {} điểm Loyalty cho userId={} từ đơn hàng #{} (số dư mới={})",
                earnedPoints, userId, displayOrderRef, newBalance);
    }

    private String generateUniqueLoyaltyCouponCode(int pointsCost) {
        String prefix = "LYL" + pointsCost + "-";
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder sb = new StringBuilder(prefix);
            for (int i = 0; i < 6; i++) {
                sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            }
            String candidate = sb.toString();
            if (!couponRepository.existsByCodeIgnoreCase(candidate)) {
                return candidate;
            }
        }
        return prefix + System.currentTimeMillis() % 1_000_000L;
    }

    private LoyaltyTransactionResponse toTransactionResponse(LoyaltyTransaction tx) {
        return LoyaltyTransactionResponse.builder()
                .id(tx.getId())
                .type(tx.getType())
                .pointsDelta(tx.getPointsDelta() != null ? tx.getPointsDelta() : 0)
                .balanceAfter(tx.getBalanceAfter() != null ? tx.getBalanceAfter() : 0)
                .referenceType(tx.getReferenceType())
                .referenceId(tx.getReferenceId())
                .description(tx.getDescription())
                .createdAt(tx.getCreatedAt())
                .build();
    }

    private void requireUserId(Long userId) {
        if (userId == null || userId <= 0) {
            throw new UnauthenticatedException("Vui lòng đăng nhập để sử dụng tính năng Loyalty");
        }
    }
}
