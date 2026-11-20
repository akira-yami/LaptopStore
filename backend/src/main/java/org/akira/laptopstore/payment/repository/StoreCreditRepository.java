package org.akira.laptopstore.payment.repository;

import lombok.RequiredArgsConstructor;
import org.akira.laptopstore.payment.dto.response.StoreCreditResponse.Entry;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class StoreCreditRepository {
    private final JdbcTemplate jdbc;

    // Cộng tiền hoàn vào ví khách hàng
    public void creditRefund(Long userId, Long orderId, Long refundRequestId, BigDecimal amount) {
        jdbc.update("""
                WITH wallet AS (
                    INSERT INTO store_credit_wallets (user_id, balance) VALUES (?, ?)
                    ON CONFLICT (user_id) DO UPDATE SET balance = store_credit_wallets.balance + EXCLUDED.balance
                    RETURNING user_id, balance
                )
                INSERT INTO store_credit_entries (user_id, order_id, refund_request_id, kind, amount, balance_after)
                SELECT user_id, ?, ?, 'REFUND', ?, balance FROM wallet
                """, userId, amount, orderId, refundRequestId, amount);
    }

    // Trừ tiền mua hàng từ ví khách hàng
    public boolean debitPurchase(Long userId, Long orderId, BigDecimal amount) {
        return jdbc.update("""
                WITH wallet AS (
                    UPDATE store_credit_wallets SET balance = balance - ?
                    WHERE user_id = ? AND balance >= ?
                    RETURNING user_id, balance
                )
                INSERT INTO store_credit_entries (user_id, order_id, kind, amount, balance_after)
                SELECT user_id, ?, 'PURCHASE', ?, balance FROM wallet
                """, amount, userId, amount, orderId, amount) == 1;
    }

    // Lấy 20 giao dịch gần nhất của ví khách hàng
    public List<Entry> latestEntries(Long userId) {
        return jdbc.query("""
                SELECT id, order_id, kind, amount, balance_after, created_at
                FROM store_credit_entries WHERE user_id = ? ORDER BY id DESC LIMIT 20
                """, (rs, row) -> new Entry(rs.getLong("id"), rs.getLong("order_id"), rs.getString("kind"),
                rs.getBigDecimal("amount"), rs.getBigDecimal("balance_after"), rs.getTimestamp("created_at").toInstant()), userId);
    }
}
