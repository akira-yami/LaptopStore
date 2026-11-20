package org.akira.laptopstore.promotion.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.akira.laptopstore.promotion.dto.request.RedeemLoyaltyCouponRequest;
import org.akira.laptopstore.promotion.dto.response.LoyaltyOverviewResponse;
import org.akira.laptopstore.promotion.dto.response.LoyaltyRedeemResponse;
import org.akira.laptopstore.promotion.service.LoyaltyService;
import org.akira.laptopstore.security.principal.CustomUserDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me/loyalty")
@RequiredArgsConstructor
public class MeLoyaltyController {

    private final LoyaltyService loyaltyService;

    @GetMapping
    public ResponseEntity<LoyaltyOverviewResponse> getMyLoyaltyOverview(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(
                loyaltyService.getMyLoyaltyOverview(userDetails.getId()));
    }

    @PostMapping("/redeem")
    public ResponseEntity<LoyaltyRedeemResponse> redeemPointsForCoupon(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody RedeemLoyaltyCouponRequest request) {
        return ResponseEntity.ok(
                loyaltyService.redeemPointsForCoupon(userDetails.getId(), request));
    }
}
