package org.akira.laptopstore.payment.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "refund_request_evidence")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequestEvidence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "refund_request_id", nullable = false)
    private Long refundRequestId;

    @Column(name = "content_type", nullable = false, length = 20)
    private String contentType;

    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] content;
}
