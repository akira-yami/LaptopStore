package org.akira.laptopstore.promotion.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "loyalty_accounts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "points_balance", nullable = false)
    private Integer pointsBalance;

    @Column(name = "total_earned", nullable = false)
    private Integer totalEarned;

    @Column(name = "total_redeemed", nullable = false)
    private Integer totalRedeemed;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.pointsBalance == null) {
            this.pointsBalance = 0;
        }
        if (this.totalEarned == null) {
            this.totalEarned = 0;
        }
        if (this.totalRedeemed == null) {
            this.totalRedeemed = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
