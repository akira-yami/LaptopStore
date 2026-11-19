import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { paymentApi } from '../../api/paymentApi';
import { VnPayReturnPage } from './VnPayReturnPage';

vi.mock('../../api/paymentApi', () => ({
  paymentApi: {
    inspectVnpayReturn: vi.fn(),
  },
}));

const renderReturnPage = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/payment/vnpay-return" element={<VnPayReturnPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('VnPayReturnPage', () => {
  it('hiển thị thanh toán thành công khi chữ ký hợp lệ và mã phản hồi 00', async () => {
    vi.mocked(paymentApi.inspectVnpayReturn).mockResolvedValue({
      signatureValid: true,
      successful: true,
      transactionRef: 'REF-123',
      responseCode: '00',
      transactionStatus: '00',
      transactionNo: '15009999',
      message: 'Payment successful',
    });

    renderReturnPage('/payment/vnpay-return?vnp_ResponseCode=00&vnp_TxnRef=REF-123');

    await waitFor(() => {
      expect(screen.getByText('Thanh toán thành công')).toBeInTheDocument();
    });
    expect(screen.getByText('REF-123')).toBeInTheDocument();
    expect(screen.getByText('15009999')).toBeInTheDocument();
    expect(paymentApi.inspectVnpayReturn).toHaveBeenCalledWith({
      vnp_ResponseCode: '00',
      vnp_TxnRef: 'REF-123',
    });
  });

  it('hiển thị thông báo lỗi khi thiếu tham số VNPay trên URL', async () => {
    renderReturnPage('/payment/vnpay-return');

    await waitFor(() => {
      expect(screen.getByText('Không thể xác minh giao dịch VNPay')).toBeInTheDocument();
    });
    expect(paymentApi.inspectVnpayReturn).not.toHaveBeenCalled();
  });
});
