import { apiErrorMessage, Badge, formatDateTime, formatMoney, Icon, Modal, ORDER_STATUS, OrderStatusBadge, PageHeading, Pager, Spinner, useToast } from '@/components/ui';
import { paymentApi } from '@/modules/payment/api/paymentApi';
import { PaymentResponse } from '@/modules/payment/types';
import { useCallback, useEffect, useState } from 'react';
import { orderApi } from '../../api/orderApi';
import { OrderDetail, OrderStatus, OrderSummary } from '../../types';

const formatPaymentBadge = (payment?: PaymentResponse): { label: string; tone: 'green' | 'orange' | 'red' | 'neutral' } | null => {
  if (!payment) return null;
  const methodLabel = payment.method === 'VNPAY' ? 'VNPay' : 'COD';
  if (payment.status === 'PAID') return { label: `${methodLabel} · Đã thanh toán`, tone: 'green' };
  if (payment.status === 'PENDING') {
    return {
      label: payment.method === 'COD' ? 'COD · Chờ thu' : 'VNPay · Chờ TT',
      tone: 'orange',
    };
  }
  if (payment.status === 'CANCELLED') return { label: `${methodLabel} · Đã hủy`, tone: 'red' };
  return { label: `${methodLabel} · Thất bại`, tone: 'red' };
};

// Khớp OrderStateMachine.VALID_TRANSITIONS và chặn chuyển tay PENDING_PAYMENT -> CONFIRMED ở backend.
const NEXT: Record<string, OrderStatus[]> = {
  CREATED: ['WAITING_CONFIRMATION', 'PENDING_PAYMENT'],
  PENDING_PAYMENT: ['CANCELLED'],
  WAITING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKING', 'CANCELLED'],
  PACKING: ['SHIPPING'],
  SHIPPING: ['DELIVERED', 'DELIVERY_FAILED'],
  DELIVERY_FAILED: ['SHIPPING', 'CANCELLED'],
  DELIVERED: ['RETURNED'],
};

const FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'WAITING_CONFIRMATION', label: 'Chờ xác nhận' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PACKING', label: 'Đang chuẩn bị' },
  { value: 'SHIPPING', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];
const PAGE_SIZE = 20;

export const StaffOrderListPage = () => {
  const toast = useToast();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [paymentsByOrderId, setPaymentsByOrderId] = useState<Record<number, PaymentResponse>>({});
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | ''>('');
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [pending, setPending] = useState<{ order: OrderSummary; to: OrderStatus } | null>(null);
  const [codTarget, setCodTarget] = useState<OrderSummary | null>(null);
  const [recordingCod, setRecordingCod] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  const load = useCallback(async (p: number, statusFilter: OrderStatus | '', searchKeyword: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await orderApi.getAllForStaff({
        page: p,
        size: PAGE_SIZE,
        status: statusFilter || undefined,
        keyword: searchKeyword || undefined,
      });
      setOrders(res.content);
      setTotalPages(res.totalPages);
      const ids = res.content.map((o) => o.id);
      if (ids.length > 0) {
        const list = await paymentApi.getByOrderIdsForStaff(ids).catch(() => [] as PaymentResponse[]);
        setPaymentsByOrderId(Object.fromEntries(list.map((pay) => [pay.orderId, pay])));
      } else {
        setPaymentsByOrderId({});
      }
    } catch {
      setError('Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page, filter, debouncedKeyword);
  }, [load, page, filter, debouncedKeyword]);

  const selectFilter = (next: OrderStatus | '') => {
    setFilter(next);
    setPage(0);
  };

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setPage(0);
  };

  const openDetail = async (orderId: number) => {
    try {
      setDetail(await orderApi.getStaffOrderById(orderId));
    } catch (err) {
      toast(apiErrorMessage(err, 'Không tải được chi tiết đơn.'), { tone: 'error' });
    }
  };

  const confirmTransition = async () => {
    if (!pending) return;
    try {
      setSaving(true);
      await orderApi.updateStatus(pending.order.id, pending.to, note.trim() || undefined);
      toast(`Đơn #${pending.order.orderCode}: ${ORDER_STATUS[pending.to]?.label ?? pending.to}.`);
      setPending(null);
      setNote('');
      await load(page, filter, debouncedKeyword);
    } catch (err) {
      toast(apiErrorMessage(err, 'Không thể cập nhật trạng thái đơn.'), { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmCodPayment = async () => {
    if (!codTarget) return;
    try {
      setRecordingCod(true);
      await paymentApi.recordCodPayment({ orderId: codTarget.id });
      toast(`Đã xác nhận thu tiền COD cho đơn #${codTarget.orderCode}.`);
      setCodTarget(null);
      await load(page, filter, debouncedKeyword);
    } catch (err) {
      toast(apiErrorMessage(err, 'Không thể xác nhận thu tiền COD (có thể đã thu hoặc đơn không phải COD).'), { tone: 'error' });
    } finally {
      setRecordingCod(false);
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="Vận hành / Đơn hàng"
        title="Đơn hàng cần xử lý"
        sub="Xác nhận, đóng gói và giao hàng theo đúng quy trình."
        actions={<button type="button" className="btn sm" onClick={() => void load(page, filter, debouncedKeyword)}><Icon name="refresh" /> Làm mới</button>}
      />

      <div className="ops-toolbar">
        <label className="search">
          <Icon name="search" />
          <input value={keyword} onChange={(e) => handleKeywordChange(e.target.value)} placeholder="Tìm mã đơn hoặc tên khách..." aria-label="Tìm đơn hàng" />
        </label>
        <div className="chips" style={{ margin: 0 }}>
          {FILTERS.map((f) => (
            <button key={f.value} type="button" className={`chip ${filter === f.value ? 'active' : ''}`} onClick={() => selectFilter(f.value as OrderStatus | '')}>{f.label}</button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Mã đơn / Thời gian</th><th>Khách hàng</th><th>Số lượng</th><th>Giá trị</th><th>Thanh toán</th><th>Trạng thái</th><th style={{ textAlign: 'right' }}>Thao tác</th></tr></thead>
            <tbody>
              {error ? (
                <tr><td colSpan={7} className="table-empty">{error}</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">Không có đơn hàng phù hợp. Thử đổi bộ lọc.</td></tr>
              ) : orders.map((o) => {
                const payment = paymentsByOrderId[o.id];
                const paymentBadge = formatPaymentBadge(payment);
                const canRecordCod = o.status === 'DELIVERED'
                  && payment?.method === 'COD'
                  && payment.status === 'PENDING';
                return (
                <tr key={o.id}>
                  <td><div className="primary-cell">#{o.orderCode}</div><div className="subcell">{formatDateTime(o.createdAt)}</div></td>
                  <td>{o.recipientName}</td>
                  <td>{o.totalItems}</td>
                  <td className="primary-cell">{formatMoney(o.totalAmount)}</td>
                  <td>{paymentBadge ? <Badge tone={paymentBadge.tone}>{paymentBadge.label}</Badge> : <span className="muted small">—</span>}</td>
                  <td><OrderStatusBadge status={o.status} /></td>
                  <td>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                      <button type="button" className="btn sm" onClick={() => void openDetail(o.id)}>Xem</button>
                      {canRecordCod && (
                        <button
                          type="button"
                          className="btn sm primary"
                          onClick={() => setCodTarget(o)}
                        >
                          Thu tiền COD
                        </button>
                      )}
                      {(NEXT[o.status === 'PACKED' ? 'PACKING' : o.status] ?? []).map((to) => (
                        <button
                          key={to}
                          type="button"
                          className={`btn sm ${to === 'CANCELLED' || to === 'DELIVERY_FAILED' ? 'danger' : 'soft'}`}
                          onClick={() => { setNote(''); setPending({ order: o, to }); }}
                        >
                          {ORDER_STATUS[to]?.label ?? to}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} totalPages={totalPages} onChange={setPage} />

      <Modal
        open={!!pending}
        title={pending ? `Chuyển đơn #${pending.order.orderCode} sang “${ORDER_STATUS[pending.to]?.label ?? pending.to}”?` : ''}
        onClose={() => setPending(null)}
        actions={<>
          <button type="button" className="btn" onClick={() => setPending(null)}>Hủy</button>
          <button type="button" className="btn primary" disabled={saving} onClick={() => void confirmTransition()}>{saving ? 'Đang lưu...' : 'Xác nhận'}</button>
        </>}
      >
        <p className="muted" style={{ marginBottom: 14 }}>Thao tác được ghi vào lịch sử đơn hàng.</p>
        <label className="field"><span>Ghi chú (tùy chọn)</span>
          <textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 70 }} />
        </label>
      </Modal>

      <Modal
        open={!!codTarget}
        title={codTarget ? `Xác nhận đã thu tiền COD đơn #${codTarget.orderCode}?` : ''}
        onClose={() => setCodTarget(null)}
        actions={(
          <>
            <button type="button" className="btn" onClick={() => setCodTarget(null)}>Hủy</button>
            <button type="button" className="btn primary" disabled={recordingCod} onClick={() => void confirmCodPayment()}>
              {recordingCod ? 'Đang lưu...' : 'Xác nhận đã thu tiền'}
            </button>
          </>
        )}
      >
        {codTarget && (
          <p className="muted">
            Xác nhận shipper đã thu đủ <strong>{formatMoney(codTarget.totalAmount)}</strong> từ khách hàng <strong>{codTarget.recipientName}</strong>.
          </p>
        )}
      </Modal>

      <Modal open={!!detail} title={detail ? `Đơn #${detail.orderCode}` : ''} onClose={() => setDetail(null)} wide>
        {detail && (
          <div className="stack">
            <div className="row between wrap">
              <div>
                <strong>{detail.recipientName}</strong> · {detail.recipientPhone}
                <p className="small muted">{detail.shippingAddress}</p>
                {detail.note && (
                  <p className="small" style={{ marginTop: 4 }}>
                    <span className="muted">Ghi chú giao hàng: </span>{detail.note}
                  </p>
                )}
              </div>
              <OrderStatusBadge status={detail.status} />
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Sản phẩm</th><th>SKU</th><th>SL</th><th>Thành tiền</th></tr></thead>
                <tbody>
                  {detail.items.map((i) => (
                    <tr key={i.id}>
                      <td><div className="primary-cell">{i.productName}</div><div className="subcell">{i.variantName}</div></td>
                      <td>{i.sku}</td><td>{i.quantity}</td><td>{formatMoney(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="summary-line total"><span>Tổng cộng</span><strong>{formatMoney(detail.totalAmount)}</strong></div>
            <div>
              <h3 style={{ marginBottom: 8 }}>Lịch sử trạng thái</h3>
              {detail.statusHistories.map((h) => (
                <p key={h.id} className="small">
                  <strong>{ORDER_STATUS[h.toStatus]?.label ?? h.toStatus}</strong>
                  <span className="muted"> · {formatDateTime(h.changedAt)}</span>
                  {h.note && <span> — {h.note}</span>}
                </p>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
