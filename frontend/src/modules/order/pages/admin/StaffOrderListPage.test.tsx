import { ToastProvider } from '@/components/ui';
import { paymentApi } from '@/modules/payment/api/paymentApi';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { orderApi } from '../../api/orderApi';
import { StaffOrderListPage } from './StaffOrderListPage';

vi.mock('../../api/orderApi', () => ({
  orderApi: {
    getAllForStaff: vi.fn(),
    getStaffOrderById: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock('@/modules/payment/api/paymentApi', () => ({
  paymentApi: {
    getByOrderIdsForStaff: vi.fn(),
    recordCodPayment: vi.fn(),
  },
}));

describe('StaffOrderListPage', () => {
  it('chỉ hiển thị nút Thu tiền COD cho đơn DELIVERED có payment COD đang PENDING, ẩn với đơn VNPay hoặc COD đã thu', async () => {
    const user = userEvent.setup();
    vi.mocked(orderApi.getAllForStaff).mockResolvedValue({
      content: [
        {
          id: 1,
          orderCode: 'ORD-VNPAY',
          status: 'PENDING_PAYMENT',
          totalItems: 1,
          totalAmount: 20000000,
          recipientName: 'Khach Online',
          createdAt: '2026-10-15T10:00:00Z',
        },
        {
          id: 2,
          orderCode: 'ORD-COD',
          status: 'DELIVERED',
          totalItems: 1,
          totalAmount: 18000000,
          recipientName: 'Khach COD',
          createdAt: '2026-10-15T09:00:00Z',
        },
        {
          id: 3,
          orderCode: 'ORD-VNPAY-DONE',
          status: 'DELIVERED',
          totalItems: 1,
          totalAmount: 25000000,
          recipientName: 'Khach VNPay Da Giao',
          createdAt: '2026-10-15T08:00:00Z',
        },
      ],
      totalElements: 3,
      totalPages: 1,
      number: 0,
      size: 20,
    });
    vi.mocked(paymentApi.getByOrderIdsForStaff).mockResolvedValue([
      {
        id: 87,
        orderId: 1,
        method: 'VNPAY',
        amount: 20000000,
        status: 'PENDING',
        createdAt: '2026-10-15T10:00:00Z',
        expiresAt: '2026-10-15T10:15:00Z',
      },
      {
        id: 88,
        orderId: 2,
        method: 'COD',
        amount: 18000000,
        status: 'PENDING',
        createdAt: '2026-10-15T09:00:00Z',
        expiresAt: null,
      },
      {
        id: 89,
        orderId: 3,
        method: 'VNPAY',
        amount: 25000000,
        status: 'PAID',
        createdAt: '2026-10-15T08:00:00Z',
        expiresAt: null,
      },
    ]);
    vi.mocked(paymentApi.recordCodPayment).mockResolvedValue({
      id: 88,
      orderId: 2,
      method: 'COD',
      amount: 18000000,
      status: 'PAID',
      createdAt: '2026-10-15T09:00:00Z',
      expiresAt: null,
    });

    render(
      <ToastProvider>
        <MemoryRouter>
          <StaffOrderListPage />
        </MemoryRouter>
      </ToastProvider>
    );

    await screen.findByText('#ORD-VNPAY');

    // Không có nút chuyển sang "Đã xác nhận" trong hàng của đơn PENDING_PAYMENT
    const vnpayRow = screen.getByText('#ORD-VNPAY').closest('tr')!;
    expect(vnpayRow).not.toHaveTextContent('Đã xác nhận');
    expect(vnpayRow).toHaveTextContent('Đã hủy');

    // Đơn DELIVERED trả bằng VNPay đã PAID KHÔNG được có nút Thu tiền COD
    const vnpayDeliveredRow = screen.getByText('#ORD-VNPAY-DONE').closest('tr')!;
    expect(vnpayDeliveredRow).toHaveTextContent('VNPay · Đã thanh toán');
    expect(vnpayDeliveredRow).not.toHaveTextContent('Thu tiền COD');

    // Đơn DELIVERED COD PENDING có nút Thu tiền COD và gọi đúng API
    await user.click(screen.getByRole('button', { name: 'Thu tiền COD' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận đã thu tiền' }));

    await waitFor(() => {
      expect(paymentApi.recordCodPayment).toHaveBeenCalledWith({ orderId: 2 });
    });
  });
});
