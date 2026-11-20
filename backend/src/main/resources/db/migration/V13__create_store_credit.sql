CREATE TABLE store_credit_wallets (
    user_id BIGINT PRIMARY KEY REFERENCES users(id),
    balance NUMERIC(19,2) NOT NULL CHECK (balance >= 0)
);

CREATE TABLE store_credit_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES store_credit_wallets(user_id),
    order_id BIGINT NOT NULL REFERENCES orders(id),
    refund_request_id BIGINT UNIQUE REFERENCES refund_requests(id),
    kind VARCHAR(20) NOT NULL,
    amount NUMERIC(19,2) NOT NULL CHECK (amount >= 0),
    balance_after NUMERIC(19,2) NOT NULL CHECK (balance_after >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((kind = 'REFUND' AND refund_request_id IS NOT NULL)
        OR (kind = 'PURCHASE' AND refund_request_id IS NULL))
);

CREATE UNIQUE INDEX uq_store_credit_purchase ON store_credit_entries (order_id) WHERE kind = 'PURCHASE';
CREATE INDEX idx_store_credit_entries_user ON store_credit_entries (user_id, id DESC);

ALTER TABLE refund_requests
    ADD COLUMN credited_to_store_credit BOOLEAN NOT NULL DEFAULT FALSE,
    ADD CONSTRAINT ck_refund_requests_store_credit CHECK (NOT credited_to_store_credit OR status = 'APPROVED');
