package org.akira.laptopstore.payment.controller;

import lombok.RequiredArgsConstructor;
import org.akira.laptopstore.security.principal.CustomUserDetails;
import org.akira.laptopstore.payment.dto.response.StoreCreditResponse;
import org.akira.laptopstore.payment.service.StoreCreditService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/store-credit")
@RequiredArgsConstructor
public class StoreCreditController {
    private final StoreCreditService storeCreditService;

    @GetMapping
    public StoreCreditResponse getWallet(@AuthenticationPrincipal CustomUserDetails user) {
        return storeCreditService.getWallet(user.getId());
    }
}
