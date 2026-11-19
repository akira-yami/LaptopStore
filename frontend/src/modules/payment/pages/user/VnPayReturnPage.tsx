import { apiErrorMessage, Badge, EmptyState, Icon, PageHeading, Spinner } from '@/components/ui';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { paymentApi } from '../../api/paymentApi';
import { VnPayReturnResponse } from '../../types';

export const VnPayReturnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<VnPayReturnResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const entries: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      entries[key] = value;
    });
    return entries;
  }, [searchParams]);

  useEffect(() => {
    if (Object.keys(queryParams).length === 0) {
      setError('Không tìm thấy tham số phản hồi từ cổng thanh toán VNPay.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    paymentApi.inspectVnpayReturn(queryParams)
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(apiErrorMessage(err, 'Không thể xác minh kết quả thanh toán VNPay.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryParams]);

  if (loading) {
    return (
      <div className="ls-container section">
        <Spinner label="Đang xác minh kết quả thanh toán VNPay" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="ls-container section">
        <EmptyState
          icon="alert"
          title="Không thể xác minh giao dịch VNPay"
          copy={error ?? 'Vui lòng kiểm tra trạng thái đơn hàng trong mục Đơn hàng của tôi.'}
          action={{ label: 'Xem đơn hàng của tôi', to: '/orders' }}
        />
      </div>
    );
  }

  const isSuccess = result.signatureValid && result.successful;

  return (
    <div className="ls-container section" style={{ maxWidth: 720 }}>
      <PageHeading
        eyebrow="Thanh toán VNPay"
        title={isSuccess ? 'Thanh toán thành công' : 'Thanh toán chưa hoàn tất'}
        sub={result.message || (isSuccess
          ? 'Giao dịch VNPay đã được xác thực. Đơn hàng của bạn đang được xử lý.'
          : 'Giao dịch bị hủy hoặc chưa thành công. Bạn có thể thử thanh toán lại trong chi tiết đơn hàng.')}
      />

      <section className="panel stack" style={{ gap: 16 }}>
        <div className="row between wrap">
          <strong>Trạng thái giao dịch</strong>
          <Badge tone={isSuccess ? 'green' : 'red'}>
            {isSuccess ? 'Thành công' : result.signatureValid ? 'Thất bại / Đã hủy' : 'Chữ ký không hợp lệ'}
          </Badge>
        </div>

        <hr className="divider" />

        <div className="summary-line">
          <span className="muted">Mã tham chiếu giao dịch</span>
          <strong>{result.transactionRef || '—'}</strong>
        </div>
        <div className="summary-line">
          <span className="muted">Mã giao dịch VNPay</span>
          <strong>{result.transactionNo || '—'}</strong>
        </div>
        <div className="summary-line">
          <span className="muted">Mã phản hồi</span>
          <strong>{result.responseCode || '—'}</strong>
        </div>
        <div className="summary-line">
          <span className="muted">Xác thực chữ ký</span>
          <strong>{result.signatureValid ? 'Hợp lệ' : 'Không hợp lệ'}</strong>
        </div>

        <div className="notice" style={{ marginTop: 4 }}>
          <Icon name={isSuccess ? 'check' : 'alert'} />
          <div>
            {isSuccess
              ? 'Trạng thái đơn hàng sẽ được cập nhật chính thức ngay khi hệ thống nhận xác nhận IPN từ VNPay.'
              : 'Nếu tiền đã bị trừ hoặc bạn muốn thử lại, hãy vào chi tiết đơn hàng để thanh toán lại trong thời hạn 15 phút.'}
          </div>
        </div>

        <div className="row wrap" style={{ gap: 12, marginTop: 8 }}>
          <Link to="/orders" className="btn primary">
            <Icon name="orders" /> Xem đơn hàng của tôi
          </Link>
          <Link to="/products" className="btn">
            Tiếp tục mua sắm
          </Link>
        </div>
      </section>
    </div>
  );
};

export default VnPayReturnPage;
