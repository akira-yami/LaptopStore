import {
  apiErrorMessage,
  Badge,
  EmptyState,
  formatDateTime,
  formatMoney,
  Icon,
  Modal,
  ORDER_STATUS,
  OrderStatusBadge,
  ProductImage,
  Spinner,
  useToast,
} from '@/components/ui';
import { useSkuProducts } from '@/modules/cart/hooks/useSkuProducts';
import { paymentApi } from '@/modules/payment/api/paymentApi';
import { PaymentResponse } from '@/modules/payment/types';
import { AccountLayout } from '@/modules/user/components/AccountLayout';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import { OrderDetail } from '../../types';

const STAGES = ['WAITING_CONFIRMATION', 'CONFIRMED', 'PACKING', 'SHIPPING', 'DELIVERED'];
const stageOf = (status: string) => {
  if (status === 'PACKED') return STAGES.indexOf('PACKING');
  if (['CREATED', 'PENDING_PAYMENT'].includes(status)) return 0;
  return STAGES.indexOf(status);
};

const PAYMENT_STATUS_LABEL: Record<string, { label: string; tone: 'green' | 'orange' | 'red' | 'neutral' }> = {
  PAID: { label: 'Đã thanh toán', tone: 'green' },
  PENDING: { label: 'Chờ thanh toán', tone: 'orange' },
  FAILED: { label: 'Thanh toán thất bại', tone: 'red' },
  CANCELLED: { label: 'Đã hủy thanh toán', tone: 'red' },
  EXPIRED: { label: 'Hết hạn thanh toán', tone: 'red' },
};

export const OrderDetailPage = () => {
  const { orderId } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const products = useSkuProducts(order?.items.map((i) => i.sku) ?? []);

  const loadOrder = useCallback(async (id: string) => {
    try {
      const detail = await orderApi.getMineById(id);
      setOrder(detail);
      setError(null);
      try {
        const pay = await paymentApi.getByOrder(detail.id);
        setPayment(pay);
      } catch {
        setPayment(null);
      }
    } catch {
      setError('Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn này.');
    }
  }, []);

  useEffect(() => {
    if (!orderId) return;
    void loadOrder(orderId);
  }, [orderId, loadOrder]);

  const handlePayVnpay = async () => {
    if (!order) return;
    try {
      setPaying(true);
      let currentPayment = payment;
      if (!currentPayment) {
        currentPayment = await paymentApi.startPayment({ orderId: order.id, method: 'VNPAY' });
        setPayment(currentPayment);
      }
      const session = await paymentApi.createVnpaySession(currentPayment.id);
      window.location.assign(session.paymentUrl);
    } catch (err) {
      toast(apiErrorMessage(err, 'Không thể khởi tạo phiên thanh toán VNPay.'), { tone: 'error' });
    } finally {
      setPaying(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    try {
      setCancelling(true);
      const updated = await orderApi.cancelOrder(order.id, cancelReason.trim() || undefined);
      setOrder(updated);
      setCancelModalOpen(false);
      setCancelReason('');
      toast(`Đã hủy đơn hàng #${order.orderCode}.`);
    } catch (err) {
      toast(apiErrorMessage(err, 'Không thể hủy đơn hàng ở trạng thái hiện tại.'), { tone: 'error' });
    } finally {
      setCancelling(false);
    }
  };

  if (error) {
    return (
      <AccountLayout title="Chi tiết đơn hàng">
        <EmptyState icon="search" title="Không tìm thấy đơn hàng" copy={error} action={{ label: 'Quay lại đơn hàng', to: '/orders' }} />
      </AccountLayout>
    );
  }
  if (!order) return <AccountLayout title="Chi tiết đơn hàng"><Spinner /></AccountLayout>;

  const current = stageOf(order.status);
  const interrupted = current < 0;
  const canCancel = order.status === 'WAITING_CONFIRMATION' || order.status === 'PENDING_PAYMENT';
  const canPayVnpay = order.status === 'PENDING_PAYMENT';
  const canReview = order.status === 'DELIVERED';
  const paymentBadge = payment ? PAYMENT_STATUS_LABEL[payment.status] : null;

  const historyDate = (status: string) => {
    const h = order.statusHistories.find((x) => x.toStatus === status || (status === 'PACKING' && x.toStatus === 'PACKED'));
    return h ? formatDateTime(h.changedAt) : 'Tiếp theo';
  };

  return (
    <AccountLayout
      title={`Đơn #${order.orderCode}`}
      sub={`Đặt lúc ${formatDateTime(order.createdAt)}`}
      actions={(
        <div className="row wrap" style={{ gap: 8 }}>
          {canPayVnpay && (
            <button type="button" className="btn primary sm" disabled={paying} onClick={() => void handlePayVnpay()}>
              {paying ? 'Đang mở VNPay...' : 'Thanh toán VNPay'}
            </button>
          )}
          {canCancel && (
            <button type="button" className="btn danger sm" onClick={() => setCancelModalOpen(true)}>
              Hủy đơn hàng
            </button>
          )}
          <Link to="/orders" className="btn sm"><Icon name="arrow-left" /> Tất cả đơn hàng</Link>
        </div>
      )}
    >
      <div className="stack">
        {canPayVnpay && (
          <div className="notice" role="status">
            <Icon name="clock" />
            <div>
              <strong>Đơn hàng đang chờ thanh toán online qua VNPay.</strong>
              <p className="small muted">Vui lòng hoàn tất thanh toán trong vòng 15 phút kể từ lúc đặt hàng để tránh đơn tự động hủy.</p>
            </div>
          </div>
        )}

        <section className="panel">
          <div className="row between wrap">
            <h3>Hành trình đơn hàng</h3>
            <OrderStatusBadge status={order.status} />
          </div>
          {interrupted ? (
            <div className="notice red" style={{ marginTop: 16 }}>
              <Icon name="alert" />
              <div><strong>{ORDER_STATUS[order.status]?.label ?? order.status}</strong><p>Cập nhật lúc {formatDateTime(order.updatedAt)}.</p></div>
            </div>
          ) : (
            <div className="timeline">
              {STAGES.map((s, i) => (
                <div key={s} className={`timeline-step ${i < current ? 'done' : i === current ? 'current' : ''}`}>
                  <div className="step-dot">{i < current ? '✓' : i + 1}</div>
                  <strong>{ORDER_STATUS[s].label}</strong>
                  <small>{historyDate(s)}</small>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid2">
          <section className="panel">
            <h3 className="panel-title">Sản phẩm</h3>
            {order.items.map((item) => {
              const info = products[item.sku];
              return (
                <div className="order-line" key={item.id}>
                  <ProductImage src={info?.thumbnailImage} alt={item.productName} hint={item.productName} />
                  <div style={{ minWidth: 0 }}>
                    <Link to={`/products/${item.productId}`}><strong>{item.productName}</strong></Link>
                    <p className="small muted">{item.variantName} · SL {item.quantity}</p>
                    {canReview && (
                      <Link
                        to={`/me/order-items/${item.id}/review`}
                        state={{
                          orderItemId: item.id,
                          orderId: order.id,
                          orderCode: order.orderCode,
                          productId: item.productId,
                          variantId: item.variantId,
                          productName: item.productName,
                          variantName: item.variantName,
                          deliveredAt: order.updatedAt,
                        }}
                        className="text-btn small"
                        style={{ marginTop: 6 }}
                      >
                        <Icon name="star" /> Viết đánh giá
                      </Link>
                    )}
                  </div>
                  <strong className="push">{formatMoney(item.lineTotal)}</strong>
                </div>
              );
            })}
          </section>
          <section className="panel">
            <h3 className="panel-title">Giao hàng & thanh toán</h3>
            <p><strong>{order.recipientName}</strong> · {order.recipientPhone}</p>
            <p className="small muted" style={{ marginTop: 4 }}>{order.shippingAddress}</p>
            {payment && (
              <div className="row between wrap" style={{ marginTop: 12 }}>
                <span className="small muted">Thanh toán ({payment.method})</span>
                {paymentBadge && <Badge tone={paymentBadge.tone}>{paymentBadge.label}</Badge>}
              </div>
            )}
            <hr className="divider" />
            <div className="summary-line"><span className="muted">Tạm tính</span><strong>{formatMoney(order.subtotal)}</strong></div>
            <div className="summary-line"><span className="muted">Giảm giá{order.couponCodeSnapshot ? ` (${order.couponCodeSnapshot})` : ''}</span><strong style={{ color: 'var(--green)' }}>−{formatMoney(order.discountAmount)}</strong></div>
            <div className="summary-line"><span className="muted">Vận chuyển</span><strong>{order.shippingFee ? formatMoney(order.shippingFee) : 'Miễn phí'}</strong></div>
            <div className="summary-line total"><span>Tổng cộng</span><strong>{formatMoney(order.totalAmount)}</strong></div>
          </section>
        </div>
      </div>

      <Modal
        open={cancelModalOpen}
        title={`Hủy đơn hàng #${order.orderCode}?`}
        onClose={() => setCancelModalOpen(false)}
        actions={(
          <>
            <button type="button" className="btn" onClick={() => setCancelModalOpen(false)}>Đóng</button>
            <button type="button" className="btn danger" disabled={cancelling} onClick={() => void handleCancelOrder()}>
              {cancelling ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
            </button>
          </>
        )}
      >
        <p className="muted" style={{ marginBottom: 14 }}>
          Tồn kho và mã giảm giá (nếu có) sẽ được hoàn lại sau khi hủy đơn thành công.
        </p>
        <label className="field">
          <span>Lý do hủy (tùy chọn)</span>
          <textarea
            rows={3}
            maxLength={300}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Ví dụ: Đổi cấu hình máy khác, đổi địa chỉ giao hàng..."
            style={{ minHeight: 72 }}
          />
        </label>
      </Modal>
    </AccountLayout>
  );
};
