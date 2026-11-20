package org.akira.laptopstore.promotion.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.akira.laptopstore.promotion.enums.LoyaltyTransactionType;

import java.time.Instant;

@Getter
@Builder
public class LoyaltyTransactionResponse {

    private Long id;
    private LoyaltyTransactionType type;
    private int pointsDelta;
    private int balanceAfter;
    private String referenceType;
    private String referenceId;
    private String description;
    private Instant createdAt;
}
