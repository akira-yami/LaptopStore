CREATE TABLE refund_requests (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES payments(order_id),
    amount NUMERIC(19,2) NOT NULL CHECK (amount >= 0),
    reason VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ,
    reviewed_by_user_id BIGINT REFERENCES users(id),
    review_note VARCHAR(1000),
    CONSTRAINT ck_refund_request_review CHECK (
        (status = 'PENDING' AND reviewed_at IS NULL AND reviewed_by_user_id IS NULL AND review_note IS NULL)
        OR (status IN ('APPROVED', 'REJECTED') AND reviewed_at IS NOT NULL AND reviewed_by_user_id IS NOT NULL
            AND (status <> 'REJECTED' OR NULLIF(TRIM(review_note), '') IS NOT NULL))
    )
);

CREATE UNIQUE INDEX uq_refund_requests_open_or_approved
    ON refund_requests (order_id) WHERE status IN ('PENDING', 'APPROVED');

CREATE INDEX idx_refund_requests_order_latest ON refund_requests (order_id, id DESC);
CREATE INDEX idx_refund_requests_status_latest ON refund_requests (status, id DESC);

CREATE TABLE refund_request_evidence (
    id BIGSERIAL PRIMARY KEY,
    refund_request_id BIGINT NOT NULL REFERENCES refund_requests(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png')),
    content BYTEA NOT NULL CHECK (octet_length(content) BETWEEN 1 AND 5242880)
);

CREATE INDEX idx_refund_request_evidence_request ON refund_request_evidence (refund_request_id, id);
