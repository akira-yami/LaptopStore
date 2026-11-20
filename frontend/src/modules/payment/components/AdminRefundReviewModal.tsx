import { apiErrorMessage, formatMoney, Modal, useToast } from '@/components/ui';
import { useState } from 'react';
import { refundApi } from '../api/refundApi';
import type { RefundRequest } from '../types';
import { RefundRequestDetails } from './RefundRequestDetails';

export const canReturnRefund = (request: RefundRequest) =>
  request.status === 'PENDING' && request.orderStatus === 'DELIVERED';

export const AdminRefundReviewModal = ({ request, onClose, onReviewed }: {
  request: RefundRequest;
  onClose: () => void;
  onReviewed: () => void;
}) => {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const returnOrder = canReturnRefund(request);
  const pending = request.status === 'PENDING';

  const review = async (approved: boolean) => {
    if (saving || (!approved && !note.trim())) return;
    try {
      setSaving(true);
      const reviewed = await refundApi.review(request.id, approved, note.trim() || undefined, approved && returnOrder);
      if (reviewed.creditedToStoreCredit) {
        toast(returnOrder && reviewed.orderStatus === 'RETURNED'
          ? 'Đã xác nhận trả hàng và cộng tiền vào ví StoreCredit.'
          : 'Đã duyệt và cộng tiền vào ví StoreCredit của khách.');
      } else {
        toast(approved ? 'Đã duyệt yêu cầu hoàn tiền.' : 'Đã từ chối yêu cầu hoàn tiền.');
      }
      onReviewed();
    } catch (err) {
      toast(apiErrorMessage(err, 'Không thể xử lý yêu cầu hoàn tiền.'), { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={`${returnOrder ? 'Trả hàng' : 'Yêu cầu hoàn tiền'} #${request.id} · Đơn #${request.orderId}`}
      onClose={() => { if (!saving) onClose(); }}
      wide
      actions={pending && (
        <>
          <button type="button" className="btn danger" disabled={saving || !note.trim()}
            onClick={() => void review(false)}>Từ chối</button>
          <button type="button" className="btn primary" disabled={saving}
            onClick={() => void review(true)}>
            {saving ? 'Đang lưu…' : returnOrder ? 'Chấp nhận trả hàng' : 'Duyệt yêu cầu'}
          </button>
        </>
      )}
    >
      <div className="stack">
        <RefundRequestDetails request={request} scope="admin" />
        {pending && (
          <>
            <p>
              {returnOrder && 'Chỉ xác nhận sau khi đã nhận lại hàng. Khi đó hệ thống sẽ nhập lại kho. '}
              Việc duyệt sẽ cộng {formatMoney(request.amount)} vào ví StoreCredit của khách.
            </p>
            <label className="field">
              <span id="refund-review-note-label">Ghi chú xử lý</span>
              <textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
                aria-labelledby="refund-review-note-label" aria-describedby="refund-review-note-help" />
              <small id="refund-review-note-help" className="muted">Nhập lý do nếu từ chối yêu cầu.</small>
            </label>
          </>
        )}
      </div>
    </Modal>
  );
};
