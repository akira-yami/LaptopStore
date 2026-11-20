-- Lưu trữ ghi chú giao hàng của khách trên bảng orders
-- và ghi chú/lý do chuyển trạng thái (hoặc lý do hủy) trên bảng order_status_history.
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS note VARCHAR(500);

ALTER TABLE order_status_history
    ADD COLUMN IF NOT EXISTS note VARCHAR(500);
