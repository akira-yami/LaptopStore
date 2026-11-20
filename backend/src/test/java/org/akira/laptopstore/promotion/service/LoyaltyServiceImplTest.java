package org.akira.laptopstore.promotion.service;

import org.akira.laptopstore.exception.ValidationException;
import org.akira.laptopstore.promotion.dto.request.RedeemLoyaltyCouponRequest;
import org.akira.laptopstore.promotion.dto.response.AvailableCouponResponse;
import org.akira.laptopstore.promotion.dto.response.LoyaltyOverviewResponse;
import org.akira.laptopstore.promotion.dto.response.LoyaltyRedeemResponse;
import org.akira.laptopstore.promotion.entity.Coupon;
import org.akira.laptopstore.promotion.entity.LoyaltyAccount;
import org.akira.laptopstore.promotion.entity.LoyaltyTransaction;
import org.akira.laptopstore.promotion.enums.DiscountType;
import org.akira.laptopstore.promotion.enums.LoyaltyTransactionType;
import org.akira.laptopstore.promotion.repository.CouponRepository;
import org.akira.laptopstore.promotion.repository.LoyaltyAccountRepository;
import org.akira.laptopstore.promotion.repository.LoyaltyTransactionRepository;
import org.akira.laptopstore.promotion.service.Impl.LoyaltyServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoyaltyServiceImplTest {

    @Mock private LoyaltyAccountRepository accounts;
    @Mock private LoyaltyTransactionRepository transactions;
    @Mock private CouponRepository coupons;
    @Mock private CouponService couponService;

    private LoyaltyServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new LoyaltyServiceImpl(accounts, transactions, coupons, couponService);
    }

    @Test
    void awardPointsForDeliveredOrderAwardsOnePointPer100kAndCreatesAccountIfMissing() {
        when(transactions.existsByOperationKey("EARN_ORDER_501")).thenReturn(false);
        when(accounts.findByUserIdForUpdate(42L)).thenReturn(Optional.empty());
        when(accounts.save(any(LoyaltyAccount.class))).thenAnswer(inv -> inv.getArgument(0));
        when(transactions.save(any(LoyaltyTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

        service.awardPointsForDeliveredOrder(42L, 501L, "ORD-501", new BigDecimal("25900000"));

        ArgumentCaptor<LoyaltyAccount> accountCaptor = ArgumentCaptor.forClass(LoyaltyAccount.class);
        verify(accounts).save(accountCaptor.capture());
        assertEquals(42L, accountCaptor.getValue().getUserId());
        assertEquals(259, accountCaptor.getValue().getPointsBalance());
        assertEquals(259, accountCaptor.getValue().getTotalEarned());
        assertEquals(0, accountCaptor.getValue().getTotalRedeemed());

        ArgumentCaptor<LoyaltyTransaction> txCaptor = ArgumentCaptor.forClass(LoyaltyTransaction.class);
        verify(transactions).save(txCaptor.capture());
        assertEquals(42L, txCaptor.getValue().getUserId());
        assertEquals(LoyaltyTransactionType.EARN_ORDER, txCaptor.getValue().getType());
        assertEquals(259, txCaptor.getValue().getPointsDelta());
        assertEquals(259, txCaptor.getValue().getBalanceAfter());
        assertEquals("ORDER", txCaptor.getValue().getReferenceType());
        assertEquals("ORD-501", txCaptor.getValue().getReferenceId());
        assertEquals("EARN_ORDER_501", txCaptor.getValue().getOperationKey());
    }

    @Test
    void awardPointsForDeliveredOrderIsIdempotentForSameOrderId() {
        when(transactions.existsByOperationKey("EARN_ORDER_501")).thenReturn(true);

        service.awardPointsForDeliveredOrder(42L, 501L, "ORD-501", new BigDecimal("25000000"));

        verify(accounts, never()).save(any());
        verify(transactions, never()).save(any());
    }

    @Test
    void awardPointsForDeliveredOrderAwardsMinimumOnePointForPositiveOrderUnder100k() {
        when(transactions.existsByOperationKey("EARN_ORDER_502")).thenReturn(false);
        LoyaltyAccount existing = LoyaltyAccount.builder()
                .id(1L).userId(42L).pointsBalance(10).totalEarned(10).totalRedeemed(0).build();
        when(accounts.findByUserIdForUpdate(42L)).thenReturn(Optional.of(existing));

        service.awardPointsForDeliveredOrder(42L, 502L, "ORD-502", new BigDecimal("50000"));

        assertEquals(11, existing.getPointsBalance());
        assertEquals(11, existing.getTotalEarned());
        verify(accounts).save(existing);
    }

    @Test
    void redeemPointsForCouponCreatesPersonalCouponDeductsPointsAndRecordsTransaction() {
        LoyaltyAccount account = LoyaltyAccount.builder()
                .id(1L).userId(42L).pointsBalance(150).totalEarned(200).totalRedeemed(50).build();
        when(accounts.findByUserIdForUpdate(42L)).thenReturn(Optional.of(account));
        when(coupons.existsByCodeIgnoreCase(any())).thenReturn(false);
        when(coupons.save(any(Coupon.class))).thenAnswer(inv -> {
            Coupon saved = inv.getArgument(0);
            saved.setId(99L);
            return saved;
        });

        LoyaltyRedeemResponse response = service.redeemPointsForCoupon(
                42L, new RedeemLoyaltyCouponRequest("COUPON_120K"));

        assertNotNull(response);
        assertEquals(50, response.getPointsBalance());
        assertEquals(150, response.getTotalRedeemed());
        assertNotNull(response.getCoupon());
        assertTrue(response.getCoupon().isPersonal());
        assertEquals(DiscountType.FIXED, response.getCoupon().getDiscountType());
        assertEquals(new BigDecimal("120000"), response.getCoupon().getDiscountValue());
        assertEquals(new BigDecimal("1000000"), response.getCoupon().getMinOrderAmount());

        ArgumentCaptor<Coupon> couponCaptor = ArgumentCaptor.forClass(Coupon.class);
        verify(coupons).save(couponCaptor.capture());
        assertEquals(42L, couponCaptor.getValue().getOwnerUserId());
        assertEquals(1, couponCaptor.getValue().getUsageLimit());
        assertEquals(1, couponCaptor.getValue().getUsagePerUser());
        assertTrue(couponCaptor.getValue().isActive());

        ArgumentCaptor<LoyaltyTransaction> txCaptor = ArgumentCaptor.forClass(LoyaltyTransaction.class);
        verify(transactions).save(txCaptor.capture());
        assertEquals(LoyaltyTransactionType.REDEEM_COUPON, txCaptor.getValue().getType());
        assertEquals(-100, txCaptor.getValue().getPointsDelta());
        assertEquals(50, txCaptor.getValue().getBalanceAfter());
        assertEquals("COUPON", txCaptor.getValue().getReferenceType());
        assertEquals(response.getCoupon().getCode(), txCaptor.getValue().getReferenceId());
    }

    @Test
    void redeemPointsForCouponRejectsWhenInsufficientPoints() {
        LoyaltyAccount account = LoyaltyAccount.builder()
                .id(1L).userId(42L).pointsBalance(40).totalEarned(40).totalRedeemed(0).build();
        when(accounts.findByUserIdForUpdate(42L)).thenReturn(Optional.of(account));

        assertThrows(ValidationException.class,
                () -> service.redeemPointsForCoupon(42L, new RedeemLoyaltyCouponRequest("COUPON_50K")));
        verify(coupons, never()).save(any());
        verify(transactions, never()).save(any());
    }

    @Test
    void redeemPointsForCouponRejectsInvalidTierCode() {
        assertThrows(ValidationException.class,
                () -> service.redeemPointsForCoupon(42L, new RedeemLoyaltyCouponRequest("INVALID_TIER")));
        verifyNoInteractions(accounts, coupons, transactions);
    }

    @Test
    void getMyLoyaltyOverviewReturnsZeroBalanceWhenAccountMissingAndIncludesAvailableCoupons() {
        when(accounts.findByUserId(42L)).thenReturn(Optional.empty());
        when(transactions.findByUserIdOrderByCreatedAtDescIdDesc(42L)).thenReturn(List.of(
                LoyaltyTransaction.builder()
                        .id(10L)
                        .userId(42L)
                        .type(LoyaltyTransactionType.EARN_ORDER)
                        .pointsDelta(120)
                        .balanceAfter(120)
                        .referenceType("ORDER")
                        .referenceId("ORD-100")
                        .description("Tích điểm từ đơn hàng #ORD-100")
                        .createdAt(Instant.parse("2026-10-01T10:00:00Z"))
                        .build()
        ));
        when(couponService.getAvailableCouponsForUser(42L)).thenReturn(List.of(
                AvailableCouponResponse.builder()
                        .id(7L)
                        .code("LYL50-ABC123")
                        .discountType(DiscountType.FIXED)
                        .discountValue(new BigDecimal("50000"))
                        .personal(true)
                        .build()
        ));

        LoyaltyOverviewResponse overview = service.getMyLoyaltyOverview(42L);

        assertNotNull(overview);
        assertEquals(0, overview.getPointsBalance());
        assertEquals(0, overview.getTotalEarned());
        assertEquals(0, overview.getTotalRedeemed());
        assertEquals(new BigDecimal("100000"), overview.getVndPerPoint());
        assertEquals(4, overview.getRewardTiers().size());
        assertEquals(1, overview.getTransactions().size());
        assertEquals(1, overview.getAvailableCoupons().size());
        assertEquals("LYL50-ABC123", overview.getAvailableCoupons().getFirst().getCode());
    }
}
