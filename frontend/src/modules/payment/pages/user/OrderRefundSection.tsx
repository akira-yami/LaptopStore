import { apiErrorMessage, Modal, Spinner, useToast } from '@/components/ui';
import { useEffect, useState } from 'react';
import { refundApi } from '../../api/refundApi';
import { RefundRequestDetails } from '../../components/RefundRequestDetails';
import type { RefundRequest } from '../../types';

const IMAGE_LIMIT = 3;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const OrderRefundSection = ({ orderId }: { orderId: number }) => {
  const toast = useToast();
  const [request, setRequest] = useState<RefundRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    refundApi.getLatest(orderId).then((result) => {
      if (active) setRequest(result);
    }).catch(() => {
      if (active) setLoadError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [orderId, reload]);

  const chooseImages = (files: File[]) => {
    if (files.length > IMAGE_LIMIT) {
      setImages([]);
      setFileError('Chỉ được đính kèm tối đa 3 ảnh.');
    } else if (files.some((file) => file.size === 0 || file.size > IMAGE_MAX_BYTES
      || !['image/jpeg', 'image/png'].includes(file.type))) {
      setImages([]);
      setFileError('Chọn ảnh JPEG hoặc PNG, tối đa 5 MB mỗi ảnh.');
    } else {
      setImages(files);
      setFileError('');
    }
  };

  const submit = async () => {
    if (!reason.trim() || fileError || submitting) return;
    try {
      setSubmitting(true);
      setRequest(await refundApi.submit(orderId, reason.trim(), images));
      setOpen(false);
      setReason('');
      setImages([]);
      toast('Đã gửi yêu cầu hoàn tiền.');
    } catch (err) {
      toast(apiErrorMessage(err, 'Không thể gửi yêu cầu hoàn tiền.'), { tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel">
      <div className="row between wrap">
        <h3>Hoàn tiền</h3>
        {!loading && !loadError && (!request || request.status === 'REJECTED') && (
          <button type="button" className="btn sm" onClick={() => setOpen(true)}>
            {request ? 'Gửi yêu cầu mới' : 'Yêu cầu hoàn tiền'}
          </button>
        )}
      </div>
      {loading && <Spinner />}
      {loadError && (
        <div className="row wrap">
          <p>Không thể tải yêu cầu hoàn tiền.</p>
          <button type="button" className="text-btn" onClick={() => setReload((current) => current + 1)}>Thử lại</button>
        </div>
      )}
      {!loading && !loadError && request && <RefundRequestDetails request={request} scope="me" />}

      <Modal
        open={open}
        title="Yêu cầu hoàn tiền"
        onClose={() => { if (!submitting) setOpen(false); }}
        actions={(
          <>
            <button type="button" className="btn" disabled={submitting} onClick={() => setOpen(false)}>Đóng</button>
            <button type="button" className="btn primary" disabled={submitting || !reason.trim() || !!fileError}
              onClick={() => void submit()}>
              {submitting ? 'Đang gửi…' : 'Gửi yêu cầu hoàn tiền'}
            </button>
          </>
        )}
      >
        <div className="stack">
          <p>Khoản hoàn sẽ được cộng vào ví StoreCredit sau khi yêu cầu được duyệt.</p>
          <label className="field">
            <span>Lý do hoàn tiền</span>
            <textarea required maxLength={1000} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="field">
            <label htmlFor="refund-images">Ảnh minh chứng (tùy chọn)</label>
            <input id="refund-images" type="file" accept="image/jpeg,image/png" multiple aria-describedby="refund-images-help"
              onChange={(e) => {
                chooseImages(Array.from(e.target.files ?? []));
                e.target.value = '';
              }} />
            <small id="refund-images-help" className="muted">Tối đa 3 ảnh JPEG hoặc PNG, mỗi ảnh tối đa 5 MB.</small>
          </div>
          {fileError && <p role="alert">{fileError}</p>}
          {(images.length > 0 || fileError) && (
            <div className="row between wrap">
              {images.length > 0 && <p className="small refund-note">{images.map((image) => image.name).join(', ')}</p>}
              <button type="button" className="text-btn" onClick={() => chooseImages([])}>Bỏ ảnh đã chọn</button>
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
};
