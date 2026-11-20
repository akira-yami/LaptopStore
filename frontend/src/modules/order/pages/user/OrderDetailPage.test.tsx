import { ToastProvider } from '@/components/ui';
import { paymentApi } from '@/modules/payment/api/paymentApi';
import { refundApi } from '@/modules/payment/api/refundApi';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { orderApi } from '../../api/orderApi';
import { OrderDetail } from '../../types';
import { OrderDetailPage } from './OrderDetailPage';

vi.mock('@/modules/cart/hooks/useSkuProducts', () => ({
  useSkuProducts: () => ({}),
}));

vi.mock('@/modules/user/components/AccountLayout', () => ({
  AccountLayout: ({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <div>{actions}</div>
      {children}
    </div>
  ),
}));

vi.mock('../../api/orderApi', () => ({
  orderApi: {
    getMineById: vi.fn(),
    cancelOrder: vi.fn(),
  },
}));

vi.mock('@/modules/payment/api/paymentApi', () => ({
  paymentApi: {
    getByOrder: vi.fn(),
    startPayment: vi.fn(),
    createVnpaySession: vi.fn(),
  },
}));

vi.mock('@/modules/payment/api/refundApi', () => ({
  refundApi: {
    getLatest: vi.fn(),
    submit: vi.fn(),
    getEvidence: vi.fn(),
  },
}));

const sampleOrder = (status: OrderDetail['status']): OrderDetail => ({
  id: 10,
  userId: 42,
  orderCode: 'ORD-10',
  status,
  totalItems: 1,
  subtotal: 25000000,
  discountAmount: 0,
  shippingFee: 0,
  totalAmount: 25000000,
  recipientName: 'Nguyen Van A',
  recipientPhone: '0901234567',
  shippingAddress: '123 Nguyen Trai, Q5, TP.HCM',
  couponCodeSnapshot: null,
  createdAt: '2026-10-15T10:00:00Z',
  updatedAt: '2026-10-15T10:05:00Z',
  items: [
    {
      id: 77,
      productId: 5,
      variantId: 9,
      productName: 'ThinkPad X1 Carbon',
      variantName: '16GB / 512GB',
      sku: 'TP-X1',
      unitPrice: 25000000,
      quantity: 1,
      lineTotal: 25000000,
    },
  ],
  statusHistories: [],
});

const renderDetail = () =>
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/orders/10']}>
        <Routes>
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.mocked(paymentApi.getByOrder).mockRejectedValue(new Error('404'));
  });

  it('gửi lý do và ảnh minh chứng khi đơn đã thanh toán', async () => {
    const user = userEvent.setup();
    vi.mocked(orderApi.getMineById).mockResolvedValue(sampleOrder('CONFIRMED'));
    vi.mocked(paymentApi.getByOrder).mockResolvedValue({
      id: 50, orderId: 10, method: 'VNPAY', amount: 25000000, status: 'PAID',
      createdAt: '2026-10-15T10:00:00Z', expiresAt: null,
    });
    vi.mocked(refundApi.getLatest).mockResolvedValue(null);
    vi.mocked(refundApi.submit).mockResolvedValue({
      id: 9, orderId: 10, orderStatus: 'CONFIRMED', amount: 25000000, reason: 'Máy bị lỗi', status: 'PENDING',
      createdAt: '2026-10-15T11:00:00Z', reviewedAt: null, reviewedByUserId: null, reviewNote: null,
      creditedToStoreCredit: false, evidenceIds: [5],
    });
    vi.mocked(refundApi.getEvidence).mockRejectedValue(new Error('Không tải được ảnh'));
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Yêu cầu hoàn tiền' }));
    expect(screen.getByRole('button', { name: 'Gửi yêu cầu hoàn tiền' })).toBeDisabled();
    await user.type(screen.getByLabelText('Lý do hoàn tiền'), 'Máy bị lỗi');
    const proof = new File(['proof'], 'minh-chung.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Ảnh minh chứng (tùy chọn)'), proof);
    expect(screen.getByText('minh-chung.png')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu hoàn tiền' }));

    expect(await screen.findByText('Chờ duyệt')).toBeInTheDocument();
    expect(refundApi.submit).toHaveBeenCalledWith(10, 'Máy bị lỗi', [proof]);
    expect(refundApi.getEvidence).toHaveBeenCalledWith(9, 5, 'me');
  });

  it.each(['WAITING_CONFIRMATION', 'CONFIRMED', 'PACKING'] as const)('cho phép khách gửi yêu cầu hủy đơn COD ở %s', async (status) => {
    const user = userEvent.setup();
    const order: OrderDetail = { ...sampleOrder(status), paymentMethod: 'COD' };
    vi.mocked(orderApi.getMineById).mockResolvedValue(order);
    vi.mocked(orderApi.cancelOrder).mockResolvedValue({ ...order, cancellationRequestReason: 'Đổi ý' });

    renderDetail();

    const cancelBtn = await screen.findByRole('button', { name: 'Yêu cầu hủy đơn hàng' });
    await user.click(cancelBtn);
    await user.type(screen.getByPlaceholderText(/Đổi cấu hình/i), 'Đổi ý');
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu hủy' }));

    expect(await screen.findByText('Yêu cầu hủy đơn hàng đang chờ duyệt')).toBeInTheDocument();
    expect(orderApi.cancelOrder).toHaveBeenCalledWith(10, 'Đổi ý');
    expect(screen.queryByRole('button', { name: 'Yêu cầu hủy đơn hàng' })).not.toBeInTheDocument();
  });

  it.each([
    ['SHIPPING', 'COD'],
    ['PACKING', 'VNPAY'],
  ] as const)('ẩn nút yêu cầu hủy ở %s với %s', async (status, paymentMethod) => {
    vi.mocked(orderApi.getMineById).mockResolvedValue({ ...sampleOrder(status), paymentMethod });

    renderDetail();

    await screen.findByText('Hành trình đơn hàng');
    expect(screen.queryByRole('button', { name: /hủy đơn hàng/i })).not.toBeInTheDocument();
  });

  it('hiển thị ghi chú giao hàng và ghi chú lịch sử trạng thái, đồng thời nạp lại payment sau khi hủy đơn', async () => {
    const user = userEvent.setup();
    const initialOrder = {
      ...sampleOrder('PENDING_PAYMENT'),
      note: 'Giao giờ hành chính, gọi trước 15 phút',
      statusHistories: [
        {
          id: 1,
          fromStatus: null,
          toStatus: 'PENDING_PAYMENT' as const,
          changedAt: '2026-10-15T10:00:00Z',
          changedBy: 42,
          note: 'Khởi tạo đơn online',
        },
      ],
    };
    const cancelledOrder = {
      ...initialOrder,
      status: 'CANCELLED' as const,
      statusHistories: [
        {
          id: 2,
          fromStatus: 'PENDING_PAYMENT' as const,
          toStatus: 'CANCELLED' as const,
          changedAt: '2026-10-15T10:05:00Z',
          changedBy: 42,
          note: 'Đổi cấu hình khác',
        },
        ...initialOrder.statusHistories,
      ],
    };
    vi.mocked(orderApi.getMineById).mockResolvedValue(initialOrder);
    vi.mocked(orderApi.cancelOrder).mockResolvedValue(cancelledOrder);
    vi.mocked(paymentApi.getByOrder)
      .mockResolvedValueOnce({
        id: 50,
        orderId: 10,
        method: 'VNPAY',
        amount: 25000000,
        status: 'PENDING',
        createdAt: '2026-10-15T10:00:00Z',
        expiresAt: '2026-10-15T10:15:00Z',
      })
      .mockResolvedValueOnce({
        id: 50,
        orderId: 10,
        method: 'VNPAY',
        amount: 25000000,
        status: 'CANCELLED',
        createdAt: '2026-10-15T10:00:00Z',
        expiresAt: '2026-10-15T10:15:00Z',
      });

    renderDetail();

    expect(await screen.findByText(/Giao giờ hành chính, gọi trước 15 phút/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hủy đơn hàng' }));
    await user.type(screen.getByPlaceholderText(/Đổi cấu hình/i), 'Đổi cấu hình khác');
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy đơn' }));

    await waitFor(() => {
      expect(screen.getByText('Đã hủy thanh toán')).toBeInTheDocument();
      expect(screen.getByText(/Đổi cấu hình khác/i)).toBeInTheDocument();
    });
  });

  it('hiển thị nút Thanh toán VNPay khi đơn đang PENDING_PAYMENT', async () => {
    const user = userEvent.setup();
    const assignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: assignSpy },
      writable: true,
    });

    vi.mocked(orderApi.getMineById).mockResolvedValue(sampleOrder('PENDING_PAYMENT'));
    vi.mocked(paymentApi.startPayment).mockResolvedValue({
      id: 50,
      orderId: 10,
      method: 'VNPAY',
      amount: 25000000,
      status: 'PENDING',
      createdAt: '2026-10-15T10:00:00Z',
      expiresAt: '2026-10-15T10:15:00Z',
    });
    vi.mocked(paymentApi.createVnpaySession).mockResolvedValue({
      paymentId: 50,
      paymentUrl: 'https://sandbox.vnpayment.vn/pay?test=1',
      expiresAt: '2026-10-15T10:15:00Z',
    });

    renderDetail();

    const payBtn = await screen.findByRole('button', { name: 'Thanh toán VNPay' });
    expect(screen.queryByRole('button', { name: 'Yêu cầu hoàn tiền' })).not.toBeInTheDocument();
    await user.click(payBtn);

    await waitFor(() => {
      expect(paymentApi.startPayment).toHaveBeenCalledWith({ orderId: 10, method: 'VNPAY' });
      expect(paymentApi.createVnpaySession).toHaveBeenCalledWith(50);
      expect(assignSpy).toHaveBeenCalledWith('https://sandbox.vnpayment.vn/pay?test=1');
    });
  });

  it('hiển thị link Viết đánh giá cho từng dòng hàng khi đơn đã DELIVERED', async () => {
    vi.mocked(orderApi.getMineById).mockResolvedValue(sampleOrder('DELIVERED'));

    renderDetail();

    const reviewLink = await screen.findByRole('link', { name: /Viết đánh giá/i });
    expect(reviewLink).toHaveAttribute('href', '/me/order-items/77/review');
    expect(screen.queryByRole('button', { name: 'Hủy đơn hàng' })).not.toBeInTheDocument();
  });
});
