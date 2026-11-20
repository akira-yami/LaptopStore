package org.akira.laptopstore.promotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.akira.laptopstore.promotion.enums.LoyaltyTransactionType;

import java.time.Instant;

@Entity
@Table(name = "loyalty_transactions")
@Getter
@Setter
@Builder
@NoArgsConstructor 
@AllArgsConstructor
public class LoyaltyTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private LoyaltyTransactionType type;

    @Column(name = "points_delta", nullable = false)
    private Integer pointsDelta;

    @Column(name = "balance_after", nullable = false)
    private Integer balanceAfter;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id", length = 255)
    private String referenceId;

    @Column(name = "operation_key", nullable = false, unique = true, length = 255)
    private String operationKey;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }
}
