import { formatDateTime, formatMoney, OrderStatusBadge, PageHeading, Pager, Spinner } from '@/components/ui';
import { useEffect, useState } from 'react';
import { refundApi } from '../../api/refundApi';
import { AdminRefundReviewModal, canReturnRefund } from '../../components/AdminRefundReviewModal';
import { RefundStatusBadge } from '../../components/RefundRequestDetails';
import type { RefundRequest, RefundRequestStatus } from '../../types';

const FILTERS: { status: RefundRequestStatus; label: string }[] = [
  { status: 'PENDING', label: 'Chờ duyệt' },
  { status: 'APPROVED', label: 'Đã duyệt' },
  { status: 'REJECTED', label: 'Đã từ chối' },
];

export const AdminRefundRequestsPage = () => {
  const [status, setStatus] = useState<RefundRequestStatus>('PENDING');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [reload, setReload] = useState(0);
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<RefundRequest | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    refundApi.list(page, status).then((result) => {
      if (!active) return;
      setRequests(result.content);
      setTotalPages(result.totalPages);
      if (page > 0 && result.content.length === 0) setPage(Math.max(0, result.totalPages - 1));
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [page, status, reload]);

  return (
    <>
      <PageHeading
        title="Yêu cầu hoàn tiền"
        actions={<button type="button" className="btn sm" onClick={() => setReload((current) => current + 1)}>Làm mới</button>}
      />
      <div className="chips" aria-label="Lọc theo trạng thái">
        {FILTERS.map((filter) => (
          <button key={filter.status} type="button" className={`chip ${status === filter.status ? 'active' : ''}`}
            aria-pressed={status === filter.status} onClick={() => {
              setStatus(filter.status);
              setPage(0);
            }}>
            {filter.label}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Yêu cầu</th><th>Đơn hàng</th><th>Số tiền</th><th>Thời gian gửi</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {error || requests.length === 0 ? (
                <tr><td className="table-empty" colSpan={6}>
                  {error ? 'Không thể tải yêu cầu hoàn tiền.' : 'Không có yêu cầu hoàn tiền ở trạng thái này.'}
                </td></tr>
              ) : requests.map((request) => (
                <tr key={request.id}>
                  <td className="primary-cell">#{request.id}</td>
                  <td><div>#{request.orderId}</div><OrderStatusBadge status={request.orderStatus} /></td>
                  <td>{formatMoney(request.amount)}</td>
                  <td>{formatDateTime(request.createdAt)}</td>
                  <td><RefundStatusBadge status={request.status} /></td>
                  <td><button type="button" className="btn sm" onClick={() => setSelected(request)}>
                    {canReturnRefund(request) ? 'Trả hàng' : request.status === 'PENDING' ? 'Xem và xử lý' : 'Xem chi tiết'}
                  </button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !error && <Pager page={page} totalPages={totalPages} onChange={setPage} />}
      {selected && (
        <AdminRefundReviewModal key={selected.id} request={selected}
          onClose={() => setSelected(null)}
          onReviewed={() => {
            setSelected(null);
            setReload((current) => current + 1);
          }} />
      )}
    </>
  );
};
