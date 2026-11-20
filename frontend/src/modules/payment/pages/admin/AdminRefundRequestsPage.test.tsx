import { ToastProvider } from '@/components/ui';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { refundApi } from '../../api/refundApi';
import type { RefundRequest } from '../../types';
import { AdminRefundRequestsPage } from './AdminRefundRequestsPage';

vi.mock('../../api/refundApi', () => ({
  refundApi: {
    list: vi.fn(),
    review: vi.fn(),
    getEvidence: vi.fn(),
  },
}));

const request: RefundRequest = {
  id: 9, orderId: 10, orderStatus: 'DELIVERED', amount: 25000000, reason: 'Máy bị lỗi', status: 'PENDING',
  createdAt: '2026-10-15T11:00:00Z', reviewedAt: null, reviewedByUserId: null, reviewNote: null,
  creditedToStoreCredit: false, evidenceIds: [5],
};

describe('AdminRefundRequestsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([true, false])('xem ảnh minh chứng trước khi quyết định duyệt %s', async (approved) => {
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = () => 'blob:test-image';
      static revokeObjectURL = vi.fn();
    });
    const user = userEvent.setup();
    vi.mocked(refundApi.list).mockResolvedValue({ content: [request], totalPages: 1, totalElements: 1, number: 0, size: 20 });
    vi.mocked(refundApi.getEvidence).mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
    vi.mocked(refundApi.review).mockResolvedValue({
      ...request, orderStatus: approved ? 'RETURNED' : 'DELIVERED',
      status: approved ? 'APPROVED' : 'REJECTED', creditedToStoreCredit: approved,
    });

    render(<ToastProvider><AdminRefundRequestsPage /></ToastProvider>);
    await user.click(await screen.findByRole('button', { name: 'Trả hàng' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Máy bị lỗi')).toBeInTheDocument();
    expect(await dialog.findByRole('img', { name: 'Ảnh minh chứng 1' })).toHaveAttribute('src', 'blob:test-image');
    expect(refundApi.getEvidence).toHaveBeenCalledWith(9, 5, 'admin');

    const reject = dialog.getByRole('button', { name: 'Từ chối' });
    expect(reject).toBeDisabled();
    if (!approved) {
      await user.type(dialog.getByLabelText(/Ghi chú xử lý/), 'Cần xác minh thêm');
    }
    await user.click(approved ? dialog.getByRole('button', { name: 'Chấp nhận trả hàng' }) : reject);
    await waitFor(() => expect(refundApi.review).toHaveBeenCalledWith(
      9, approved, approved ? undefined : 'Cần xác minh thêm', approved,
    ));
  });
});
