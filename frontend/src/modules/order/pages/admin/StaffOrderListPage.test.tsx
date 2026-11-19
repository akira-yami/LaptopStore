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
    recordCodPayment: vi.fn(),
  },
}));

describe('StaffOrderListPage', () => {
  it('không hiển thị nút xác nhận tay cho đơn PENDING_PAYMENT và cho phép thu tiền COD trên đơn DELIVERED', async () => {
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
      ],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 20,
    });
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

    // Đơn DELIVERED có nút Thu tiền COD và gọi đúng API
    await user.click(screen.getByRole('button', { name: 'Thu tiền COD' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận đã thu tiền' }));

    await waitFor(() => {
      expect(paymentApi.recordCodPayment).toHaveBeenCalledWith({ orderId: 2 });
    });
  });
});
