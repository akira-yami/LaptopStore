-- Đồng bộ ràng buộc idempotency_key ở DB với logic tra cứu findByIdempotencyKeyAndUserId(key, userId):
-- Phạm vi duy nhất phải tính theo từng cặp (user_id, idempotency_key), thay vì toàn cục trên toàn bảng orders.
-- Như vậy hai người dùng khác nhau dùng cùng giá trị Idempotency-Key sẽ không xung đột nhau,
-- trong khi một người dùng gửi trùng Idempotency-Key (kể cả khi gửi song song đồng thời) vẫn bị DB chặn trùng.

-- Gỡ bỏ unique constraint toàn cục cũ (từ V1 hoặc V2 nếu DB khởi tạo từ V2)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS uq_orders_idempotency_key;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_idempotency_key_key;

-- Bổ sung unique constraint ghép theo cặp (user_id, idempotency_key).
-- Trong PostgreSQL, UNIQUE mặc định coi các giá trị NULL là phân biệt, nên một user vẫn có thể có nhiều đơn không truyền idempotency_key (NULL).
ALTER TABLE orders
    ADD CONSTRAINT uq_orders_user_idempotency_key UNIQUE (user_id, idempotency_key);
