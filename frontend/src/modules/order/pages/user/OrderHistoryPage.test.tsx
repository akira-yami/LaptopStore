import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { orderApi } from '../../api/orderApi';
import { OrderHistoryPage } from './OrderHistoryPage';

vi.mock('@/modules/user/components/AccountLayout', () => ({
  AccountLayout: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('../../api/orderApi', () => ({
  orderApi: {
    getMine: vi.fn(),
  },
}));

describe('OrderHistoryPage', () => {
  it('lọc theo trạng thái ở server và hỗ trợ phân trang cho lịch sử đơn hàng', async () => {
    const user = userEvent.setup();
    vi.mocked(orderApi.getMine).mockResolvedValue({
      content: [
        {
          id: 10,
          orderCode: 'ORD-10',
          status: 'WAITING_CONFIRMATION',
          totalItems: 1,
          totalAmount: 20000000,
          recipientName: 'Khach A',
          createdAt: '2026-10-15T10:00:00Z',
        },
      ],
      totalElements: 45,
      totalPages: 3,
      number: 0,
      size: 20,
    });

    render(
      <MemoryRouter>
        <OrderHistoryPage />
      </MemoryRouter>
    );

    await screen.findByText('#ORD-10');
    expect(screen.getByRole('navigation', { name: 'Phân trang' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Chờ xử lý' }));
    await waitFor(() => {
      expect(orderApi.getMine).toHaveBeenCalledWith(expect.objectContaining({
        page: 0,
        status: ['CREATED', 'PENDING_PAYMENT', 'WAITING_CONFIRMATION'],
      }));
    });

    await user.click(screen.getByRole('button', { name: 'Trang sau' }));
    await waitFor(() => {
      expect(orderApi.getMine).toHaveBeenCalledWith(expect.objectContaining({
        page: 1,
      }));
    });
  });
});
