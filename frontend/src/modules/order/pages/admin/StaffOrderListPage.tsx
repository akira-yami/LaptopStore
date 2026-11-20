import { apiErrorMessage, Badge, formatDateTime, formatMoney, Icon, Modal, ORDER_STATUS, OrderStatusBadge, PageHeading, Pager, Spinner, useToast } from '@/components/ui';
import { paymentApi } from '@/modules/payment/api/paymentApi';
import { refundApi } from '@/modules/payment/api/refundApi';
import { AdminRefundReviewModal, canReturnRefund } from '@/modules/payment/components/AdminRefundReviewModal';
import { PAYMENT_METHOD_LABEL, PaymentResponse, RefundRequest } from '@/modules/payment/types';
import { useCallback, useEffect, useState } from 'react';
import { orderApi } from '../../api/orderApi';
import { OrderDetail, OrderStatus, OrderSummary } from '../../types';

const formatPaymentBadge = (payment?: PaymentResponse): { label: string; tone: 'green' | 'orange' | 'red' | 'neutral' } | null => {
  if (!payment) return null;
  const methodLabel = PAYMENT_METHOD_LABEL[payment.method];
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

// Các bước xử lý thông thường. Đơn có yêu cầu hủy chờ staff/admin duyệt.
const NEXT: Record<string, OrderStatus[]> = {
  CREATED: ['WAITING_CONFIRMATION', 'PENDING_PAYMENT'],
  PENDING_PAYMENT: ['CANCELLED'],
  WAITING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKING', 'CANCELLED'],
  PACKING: ['SHIPPING'],
  SHIPPING: ['DELIVERED', 'DELIVERY_FAILED'],
  DELIVERY_FAILED: ['SHIPPING', 'CANCELLED'],
};

const FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'WAITING_CONFIRMATION', label: 'Chờ xác nhận' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PACKING', label: 'Đang chuẩn bị' },
  { value: 'SHIPPING', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'RETURNED', label: 'Đã trả hàng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];
const PAGE_SIZE = 20;

export const StaffOrderListPage = ({ canReviewReturns = false }: { canReviewReturns?: boolean }) => {
  const toast = useToast();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [paymentsByOrderId, setPaymentsByOrderId] = useState<Record<number, PaymentResponse>>({});
  const [returnsByOrderId, setReturnsByOrderId] = useState<Record<number, RefundRequest>>({});
  const [returnLoadError, setReturnLoadError] = useState(false);
  const [returnTarget, setReturnTarget] = useState<RefundRequest | null>(null);
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
  const isCancellationApproval = pending?.to === 'CANCELLED' && Boolean(pending.order.cancellationRequestReason);

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
      setReturnLoadError(false);
      const res = await orderApi.getAllForStaff({
        page: p,
        size: PAGE_SIZE,
        status: statusFilter || undefined,
        keyword: searchKeyword || undefined,
      });
      setOrders(res.content);
      setTotalPages(res.totalPages);
      const ids = res.content.map((o) => o.id);
      const deliveredIds = res.content.filter((o) => o.status === 'DELIVERED').map((o) => o.id);
      const [payments, refunds] = await Promise.all([
        paymentApi.getByOrderIdsForStaff(ids).catch(() => [] as PaymentResponse[]),
        canReviewReturns && deliveredIds.length > 0
          ? refundApi.list(0, 'PENDING', deliveredIds).then((result) => result.content).catch(() => {
            setReturnLoadError(true);
            return [];
          })
          : Promise.resolve([]),
      ]);
      setPaymentsByOrderId(Object.fromEntries(payments.map((pay) => [pay.orderId, pay])));
      setReturnsByOrderId(Object.fromEntries(refunds.filter(canReturnRefund).map((refund) => [refund.orderId, refund])));
    } catch {
      setError('Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, [canReviewReturns]);

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
      {returnLoadError && <p role="alert" className="notice red">Không thể tải yêu cầu trả hàng. Bấm Làm mới để thử lại.</p>}

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
                const returnRequest = canReviewReturns && o.status === 'DELIVERED' ? returnsByOrderId[o.id] : undefined;
                const paymentBadge = formatPaymentBadge(payment);
                const transitions: OrderStatus[] = o.cancellationRequestReason ? ['CANCELLED'] : NEXT[o.status] ?? [];
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
                  <td>
                    <OrderStatusBadge status={o.status} />
                    {o.cancellationRequestReason && <div className="subcell">Chờ duyệt yêu cầu hủy</div>}
                  </td>
                  <td>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                      <button type="button" className="btn sm" onClick={() => void openDetail(o.id)}>Xem</button>
                      {returnRequest && (
                        <button type="button" className="btn sm soft" onClick={() => setReturnTarget(returnRequest)}>Trả hàng</button>
                      )}
                      {canRecordCod && (
                        <button
                          type="button"
                          className="btn sm primary"
                          onClick={() => setCodTarget(o)}
                        >
                          Thu tiền COD
                        </button>
                      )}
                      {transitions.map((to) => (
                        <button
                          key={to}
                          type="button"
                          className={`btn sm ${to === 'CANCELLED' || to === 'DELIVERY_FAILED' ? 'danger' : 'soft'}`}
                          onClick={() => { setNote(''); setPending({ order: o, to }); }}
                        >
                          {o.cancellationRequestReason ? 'Duyệt yêu cầu hủy' : ORDER_STATUS[to]?.label ?? to}
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
      {canReviewReturns && returnTarget && (
        <AdminRefundReviewModal key={returnTarget.id} request={returnTarget}
          onClose={() => setReturnTarget(null)}
          onReviewed={() => {
            setReturnTarget(null);
            void load(page, filter, debouncedKeyword);
          }} />
      )}

      <Modal
        open={!!pending}
        title={pending ? (isCancellationApproval
          ? `Duyệt yêu cầu hủy đơn #${pending.order.orderCode}?`
          : `Chuyển đơn #${pending.order.orderCode} sang “${ORDER_STATUS[pending.to]?.label ?? pending.to}”?`) : ''}
        onClose={() => setPending(null)}
        actions={<>
          <button type="button" className="btn" onClick={() => setPending(null)}>Hủy</button>
          <button type="button" className="btn primary" disabled={saving} onClick={() => void confirmTransition()}>
            {saving ? 'Đang lưu...' : isCancellationApproval ? 'Xác nhận duyệt hủy' : 'Xác nhận'}
          </button>
        </>}
      >
        <p className="muted" style={{ marginBottom: 14 }}>Thao tác được ghi vào lịch sử đơn hàng.</p>
        {isCancellationApproval ? (
          <p><strong>Lý do khách yêu cầu hủy</strong><br />{pending?.order.cancellationRequestReason}</p>
        ) : (
          <label className="field"><span>Ghi chú (tùy chọn)</span>
            <textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 70 }} />
          </label>
        )}
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
            {detail.cancellationRequestReason && (
              <p><strong>Yêu cầu hủy đang chờ duyệt</strong><br />{detail.cancellationRequestReason}</p>
            )}
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
