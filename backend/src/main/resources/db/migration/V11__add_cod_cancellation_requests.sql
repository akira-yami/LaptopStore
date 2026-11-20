ALTER TABLE orders
    ADD COLUMN payment_method VARCHAR(30),
    ADD COLUMN cancellation_request_reason VARCHAR(500);

UPDATE orders o
SET payment_method = p.method
FROM payments p
WHERE p.order_id = o.id;

UPDATE orders o
SET payment_method = CASE h.to_status WHEN 'WAITING_CONFIRMATION' THEN 'COD' ELSE 'VNPAY' END
FROM (
    SELECT DISTINCT ON (order_id) order_id, to_status
    FROM order_status_history
    WHERE from_status IS NULL AND to_status IN ('WAITING_CONFIRMATION', 'PENDING_PAYMENT')
    ORDER BY order_id, changed_at, id
) h
WHERE h.order_id = o.id AND o.payment_method IS NULL;

UPDATE orders
SET payment_method = CASE status WHEN 'WAITING_CONFIRMATION' THEN 'COD' ELSE 'VNPAY' END
WHERE payment_method IS NULL AND status IN ('WAITING_CONFIRMATION', 'PENDING_PAYMENT');
