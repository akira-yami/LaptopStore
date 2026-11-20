import { Badge, formatDateTime, formatMoney } from '@/components/ui';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { refundApi } from '../api/refundApi';
import type { RefundRequest, RefundRequestStatus } from '../types';

const STATUS_LABELS = {
  PENDING: { label: 'Chờ duyệt', tone: 'orange' },
  APPROVED: { label: 'Đã duyệt', tone: 'green' },
  REJECTED: { label: 'Đã từ chối', tone: 'red' },
} as const;

export const RefundStatusBadge = ({ status }: { status: RefundRequestStatus }) => (
  <Badge tone={STATUS_LABELS[status].tone}>{STATUS_LABELS[status].label}</Badge>
);

const EvidenceImage = ({ requestId, evidenceId, scope, index }: {
  requestId: number;
  evidenceId: number;
  scope: 'me' | 'admin';
  index: number;
}) => {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    refundApi.getEvidence(requestId, evidenceId, scope).then((image) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(image);
      setUrl(objectUrl);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [requestId, evidenceId, scope]);

  if (failed) return <p className="small muted">Không tải được ảnh minh chứng {index + 1}.</p>;
  if (!url) return <p className="small muted">Đang tải ảnh {index + 1}…</p>;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img className="refund-evidence-image" src={url} alt={`Ảnh minh chứng ${index + 1}`} />
    </a>
  );
};

export const RefundRequestDetails = ({ request, scope }: { request: RefundRequest; scope: 'me' | 'admin' }) => (
  <div className="stack">
    <div className="row between wrap">
      <strong>{formatMoney(request.amount)}</strong>
      <RefundStatusBadge status={request.status} />
    </div>
    <p className="small muted">Gửi lúc {formatDateTime(request.createdAt)}</p>
    <div>
      <strong>Lý do yêu cầu</strong>
      <p className="refund-note">{request.reason}</p>
    </div>
    {request.evidenceIds.length > 0 && (
      <div>
        <strong>Ảnh minh chứng</strong>
        <div className="refund-evidence-grid">
          {request.evidenceIds.map((id, index) => (
            <EvidenceImage key={id} requestId={request.id} evidenceId={id} scope={scope} index={index} />
          ))}
        </div>
      </div>
    )}
    {request.reviewedAt && (
      <div>
        <p className="small muted">Xử lý lúc {formatDateTime(request.reviewedAt)}</p>
        {request.reviewNote && (
          <>
            <strong>{request.status === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú của quản trị viên'}</strong>
            <p className="refund-note">{request.reviewNote}</p>
          </>
        )}
        {request.creditedToStoreCredit && (
          <p>
            Đã cộng {formatMoney(request.amount)} vào ví StoreCredit.
            {scope === 'me' && <> <Link to="/me/store-credit" className="text-btn">Xem ví StoreCredit</Link></>}
          </p>
        )}
        {request.status === 'APPROVED' && !request.creditedToStoreCredit && (
          <p>Yêu cầu được duyệt theo quy trình hoàn tiền trước đây.</p>
        )}
      </div>
    )}
  </div>
);
