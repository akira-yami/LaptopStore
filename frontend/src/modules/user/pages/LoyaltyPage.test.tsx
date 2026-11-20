import { ToastProvider } from '@/components/ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userApi } from '../api/userApi';
import { LoyaltyOverview } from '../types';
import { LoyaltyPage } from './LoyaltyPage';

vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 42, fullName: 'Phan Anh Khang', email: 'user@example.com', roles: ['ROLE_USER'] },
    logout: vi.fn(),
  }),
}));

vi.mock('../api/userApi', () => ({
  userApi: {
    getLoyaltyOverview: vi.fn(),
    redeemLoyaltyCoupon: vi.fn(),
    getAvailableCoupons: vi.fn(),
  },
}));

const initialOverview: LoyaltyOverview = {
  pointsBalance: 130,
  totalEarned: 230,
  totalRedeemed: 100,
  vndPerPoint: 100000,
  rewardTiers: [
    {
      tierCode: 'COUPON_50K',
      title: 'Voucher giảm 50.000 ₫',
      pointsCost: 50,
      discountType: 'FIXED',
      discountValue: 50000,
      minOrderAmount: 500000,
      validDays: 30,
      description: 'Giảm 50.000 ₫ cho đơn hàng từ 500.000 ₫ (Hiệu lực 30 ngày)',
    },
    {
      tierCode: 'COUPON_120K',
      title: 'Voucher giảm 120.000 ₫',
      pointsCost: 100,
      discountType: 'FIXED',
      discountValue: 120000,
      minOrderAmount: 1000000,
      validDays: 30,
      description: 'Giảm 120.000 ₫ cho đơn hàng từ 1.000.000 ₫ (Hiệu lực 30 ngày)',
    },
    {
      tierCode: 'COUPON_300K',
      title: 'Voucher giảm 300.000 ₫',
      pointsCost: 200,
      discountType: 'FIXED',
      discountValue: 300000,
      minOrderAmount: 2000000,
      validDays: 30,
      description: 'Giảm 300.000 ₫ cho đơn hàng từ 2.000.000 ₫ (Hiệu lực 30 ngày)',
    },
  ],
  availableCoupons: [
    {
      id: 1,
      code: 'LYL50-ABC123',
      discountType: 'FIXED',
      discountValue: 50000,
      minOrderAmount: 500000,
      remainingUserUses: 1,
      endsAt: '2026-12-20T10:00:00Z',
      personal: true,
    },
    {
      id: 2,
      code: 'WELCOME10',
      discountType: 'PERCENT',
      discountValue: 10,
      maxDiscount: 300000,
      minOrderAmount: 2000000,
      remainingUserUses: 1,
      endsAt: '2026-12-31T10:00:00Z',
      personal: false,
    },
  ],
  transactions: [
    {
      id: 101,
      type: 'EARN_ORDER',
      pointsDelta: 230,
      balanceAfter: 230,
      referenceType: 'ORDER',
      referenceId: 'ORD-20261120-01',
      description: 'Tích điểm từ đơn hàng #ORD-20261120-01',
      createdAt: '2026-11-20T09:00:00Z',
    },
    {
      id: 102,
      type: 'REDEEM_COUPON',
      pointsDelta: -100,
      balanceAfter: 130,
      referenceType: 'COUPON',
      referenceId: 'LYL50-ABC123',
      description: 'Đổi 100 điểm lấy mã LYL50-ABC123',
      createdAt: '2026-11-20T10:00:00Z',
    },
  ],
};

describe('LoyaltyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userApi.getLoyaltyOverview).mockResolvedValue(initialOverview);
  });

  it('hiển thị điểm Loyalty hiện có, gói đổi Coupon, danh sách Coupon có thể dùng và lịch sử tích/đổi điểm', async () => {
    render(
      <MemoryRouter initialEntries={['/me/loyalty']}>
        <ToastProvider>
          <LoyaltyPage />
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('130 điểm')).toBeInTheDocument();
    expect(screen.getByText('Voucher giảm 120.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('LYL50-ABC123')).toBeInTheDocument();
    expect(screen.getByText('WELCOME10')).toBeInTheDocument();
    expect(screen.getByText(/Tích điểm từ đơn hàng #ORD-20261120-01/i)).toBeInTheDocument();

    // Gói 200 điểm vượt quá số dư 130 điểm phải bị vô hiệu hóa
    const unavailableBtn = screen.getByRole('button', { name: /Chưa đủ điểm/i });
    expect(unavailableBtn).toBeDisabled();
  });

  it('cho phép đổi điểm Loyalty sang Coupon mới và cập nhật số dư + danh sách Coupon có thể dùng', async () => {
    vi.mocked(userApi.redeemLoyaltyCoupon).mockResolvedValue({
      coupon: {
        id: 3,
        code: 'LYL100-NEW999',
        discountType: 'FIXED',
        discountValue: 120000,
        minOrderAmount: 1000000,
        remainingUserUses: 1,
        endsAt: '2026-12-20T10:00:00Z',
        personal: true,
      },
      pointsBalance: 30,
      totalRedeemed: 200,
      message: 'Đổi điểm thành công! Mã coupon của bạn là LYL100-NEW999',
    });

    vi.mocked(userApi.getLoyaltyOverview)
      .mockResolvedValueOnce(initialOverview)
      .mockResolvedValueOnce({
        ...initialOverview,
        pointsBalance: 30,
        totalRedeemed: 200,
        availableCoupons: [
          {
            id: 3,
            code: 'LYL100-NEW999',
            discountType: 'FIXED',
            discountValue: 120000,
            minOrderAmount: 1000000,
            remainingUserUses: 1,
            endsAt: '2026-12-20T10:00:00Z',
            personal: true,
          },
          ...initialOverview.availableCoupons,
        ],
      });

    render(
      <MemoryRouter initialEntries={['/me/loyalty']}>
        <ToastProvider>
          <LoyaltyPage />
        </ToastProvider>
      </MemoryRouter>,
    );

    await screen.findByText('130 điểm');

    const redeem100Btn = screen.getByTestId('redeem-tier-COUPON_120K');
    fireEvent.click(redeem100Btn);

    await waitFor(() => {
      expect(userApi.redeemLoyaltyCoupon).toHaveBeenCalledWith('COUPON_120K');
    });

    expect(await screen.findByText('30 điểm')).toBeInTheDocument();
    expect(screen.getByText('LYL100-NEW999')).toBeInTheDocument();
  });
});
