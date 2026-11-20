import { ToastProvider } from '@/components/ui';
import { paymentApi } from '@/modules/payment/api/paymentApi';
import { refundApi } from '@/modules/payment/api/refundApi';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { orderApi } from '../../api/orderApi';
import type { OrderSummary } from '../../types';
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

vi.mock('@/modules/payment/api/refundApi', () => ({
  refundApi: { list: vi.fn() },
}));

describe('StaffOrderListPage', () => {
  it.each([true, false])('giới hạn nút trả hàng theo quyền quản trị (%s) và yêu cầu chờ duyệt', async (admin) => {
    const order: OrderSummary = {
      id: 1, orderCode: 'ORD-RETURN', status: 'DELIVERED', totalItems: 1,
      totalAmount: 20000000, recipientName: 'Khách', createdAt: '2026-10-15T10:00:00Z',
    };
    vi.mocked(orderApi.getAllForStaff).mockResolvedValue({
      content: [order, { ...order, id: 2, orderCode: 'ORD-NO-REFUND' },
        { ...order, id: 3, orderCode: 'ORD-SHIPPING', status: 'SHIPPING' }],
      totalPages: 1, totalElements: 3, number: 0, size: 20,
    });
    vi.mocked(paymentApi.getByOrderIdsForStaff).mockResolvedValue([]);
    vi.mocked(refundApi.list).mockClear().mockResolvedValue({
      content: [{
        id: 9, orderId: 1, orderStatus: 'DELIVERED', amount: order.totalAmount, reason: 'Lỗi màn hình',
        status: 'PENDING', createdAt: order.createdAt, reviewedAt: null, reviewedByUserId: null, reviewNote: null,
        creditedToStoreCredit: false, evidenceIds: [],
      }],
      totalPages: 1, totalElements: 1, number: 0, size: 20,
    });

    render(<ToastProvider><MemoryRouter><StaffOrderListPage canReviewReturns={admin} /></MemoryRouter></ToastProvider>);

    const eligible = (await screen.findByText('#ORD-RETURN')).closest('tr')!;
    const noRefund = screen.getByText('#ORD-NO-REFUND').closest('tr')!;
    expect(within(noRefund).queryByRole('button', { name: 'Trả hàng' })).not.toBeInTheDocument();
    if (admin) {
      expect(refundApi.list).toHaveBeenCalledWith(0, 'PENDING', [1, 2]);
      await userEvent.click(within(eligible).getByRole('button', { name: 'Trả hàng' }));
      expect(within(screen.getByRole('dialog')).getByText('Lỗi màn hình')).toBeInTheDocument();
    } else {
      expect(refundApi.list).not.toHaveBeenCalled();
      expect(within(eligible).queryByRole('button', { name: 'Trả hàng' })).not.toBeInTheDocument();
    }
  });

  it('hiển thị lý do và cho phép duyệt yêu cầu hủy của đơn COD đang chuẩn bị', async () => {
    const user = userEvent.setup();
    vi.mocked(orderApi.getAllForStaff).mockResolvedValue({
      content: [{
        id: 12,
        orderCode: 'ORD-CANCEL',
        status: 'PACKING',
        totalItems: 1,
        totalAmount: 18000000,
        recipientName: 'Khách COD',
        createdAt: '2026-10-15T09:00:00Z',
        cancellationRequestReason: 'Đổi cấu hình',
      }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
    });
    vi.mocked(paymentApi.getByOrderIdsForStaff).mockResolvedValue([]);

    render(<ToastProvider><MemoryRouter><StaffOrderListPage /></MemoryRouter></ToastProvider>);

    const row = (await screen.findByText('#ORD-CANCEL')).closest('tr')!;
    expect(within(row).queryByRole('button', { name: 'Đang giao' })).not.toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: 'Duyệt yêu cầu hủy' }));
    expect(screen.getByText('Đổi cấu hình')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xác nhận duyệt hủy' }));

    await waitFor(() => expect(orderApi.updateStatus).toHaveBeenCalledWith(12, 'CANCELLED', undefined));
  });

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

    // Bấm chip lọc trạng thái "Đã giao" -> phải gửi status=DELIVERED lên server thay vì chỉ lọc client-side
    await user.click(screen.getByRole('button', { name: 'Đã giao' }));
    await waitFor(() => {
      expect(orderApi.getAllForStaff).toHaveBeenCalledWith(expect.objectContaining({
        page: 0,
        status: 'DELIVERED',
      }));
    });
  });
});
