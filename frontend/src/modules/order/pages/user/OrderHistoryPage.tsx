import { EmptyState, formatDateTime, formatMoney, Icon, ORDER_STATUS, OrderStatusBadge, Pager, Spinner } from '@/components/ui';
import { AccountLayout } from '@/modules/user/components/AccountLayout';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import { OrderStatus, OrderSummary } from '../../types';

const PAGE_SIZE = 20;

const FILTERS: { value: string; label: string; match?: OrderStatus[] }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xử lý', match: ['CREATED', 'PENDING_PAYMENT', 'WAITING_CONFIRMATION'] },
  { value: 'active', label: 'Đang giao', match: ['CONFIRMED', 'PACKING', 'SHIPPING'] },
  { value: 'done', label: 'Đã giao', match: ['DELIVERED'] },
  { value: 'cancelled', label: 'Đã hủy', match: ['CANCELLED', 'RETURNED', 'DELIVERY_FAILED'] },
];

export const OrderHistoryPage = () => {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    const active = FILTERS.find((x) => x.value === filter);
    setLoading(true);
    setError(null);
    orderApi.getMine({ page, size: PAGE_SIZE, status: active?.match })
      .then((res) => {
        if (cancelled) return;
        setOrders(res.content);
        setTotalPages(res.totalPages);
      })
      .catch(() => {
        if (!cancelled) setError('Không thể tải lịch sử đơn hàng.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, filter]);

  const selectFilter = (next: string) => {
    setFilter(next);
    setPage(0);
  };

  return (
    <AccountLayout title="Đơn hàng của tôi" sub="Theo dõi trạng thái và lịch sử mua sắm của bạn.">
      <div className="chips" style={{ marginTop: 0 }}>
        {FILTERS.map((f) => (
          <button key={f.value} type="button" className={`chip ${filter === f.value ? 'active' : ''}`} onClick={() => selectFilter(f.value)}>{f.label}</button>
        ))}
      </div>
      {loading ? <Spinner /> : error ? (
        <EmptyState icon="alert" title="Không tải được đơn hàng" copy={error} />
      ) : orders.length === 0 ? (
        filter ? (
          <p className="muted small">Không có đơn nào ở trạng thái này.</p>
        ) : (
          <EmptyState icon="orders" title="Bạn chưa có đơn hàng nào" copy="Những đơn hàng bạn đặt sẽ xuất hiện tại đây để tiện theo dõi." action={{ label: 'Bắt đầu mua sắm', to: '/products' }} />
        )
      ) : (
        <>
          <div className="stack" style={{ gap: 14 }}>
            {orders.map((order) => (
              <article key={order.id} className="panel order-card">
                <div className="row between wrap">
                  <div>
                    <strong>#{order.orderCode}</strong>
                    <p className="small muted">{formatDateTime(order.createdAt)} · {order.recipientName}</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                  {order.cancellationRequestReason && <span className="small muted">Chờ duyệt yêu cầu hủy</span>}
                </div>
                <div className="order-actions">
                  <span className="muted small">{order.totalItems} sản phẩm · {ORDER_STATUS[order.status]?.label ?? order.status}</span>
                  <div className="row">
                    <strong style={{ color: 'var(--orange)', fontSize: 16 }}>{formatMoney(order.totalAmount)}</strong>
                    <Link to={`/orders/${order.id}`} className="btn sm">Xem chi tiết <Icon name="arrow-right" /></Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Pager page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </AccountLayout>
  );
};
