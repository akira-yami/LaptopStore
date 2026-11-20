package org.akira.laptopstore.payment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.akira.laptopstore.payment.enums.RefundRequestStatus;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "refund_requests")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RefundRequestStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "reviewed_by_user_id")
    private Long reviewedByUserId;

    @Column(name = "review_note", length = 1000)
    private String reviewNote;

    @Column(name = "credited_to_store_credit", nullable = false)
    private boolean creditedToStoreCredit;
}
