-- V10: Bổ sung cột owner_user_id cho coupons (coupon cá nhân đổi từ điểm Loyalty)
-- và tạo bảng loyalty_accounts, loyalty_transactions.

ALTER TABLE coupons
    ADD COLUMN IF NOT EXISTS owner_user_id BIGINT REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_coupons_owner_user_id
    ON coupons(owner_user_id);

CREATE TABLE IF NOT EXISTS loyalty_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
    points_balance INT NOT NULL DEFAULT 0,
    total_earned INT NOT NULL DEFAULT 0,
    total_redeemed INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_loyalty_accounts_points_balance_non_negative CHECK (points_balance >= 0),
    CONSTRAINT chk_loyalty_accounts_total_earned_non_negative CHECK (total_earned >= 0),
    CONSTRAINT chk_loyalty_accounts_total_redeemed_non_negative CHECK (total_redeemed >= 0)
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    type VARCHAR(30) NOT NULL,
    points_delta INT NOT NULL,
    balance_after INT NOT NULL,
    reference_type VARCHAR(50),
    reference_id VARCHAR(255),
    operation_key VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_created_at
    ON loyalty_transactions(user_id, created_at DESC);
