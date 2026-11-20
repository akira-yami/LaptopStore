import { ToastProvider } from '@/components/ui';
import { cartApi } from '@/modules/cart/api/cartApi';
import { paymentApi } from '@/modules/payment/api/paymentApi';
import { userApi } from '@/modules/user/api/userApi';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { orderApi } from '../../api/orderApi';
import { CheckoutPage } from './CheckoutPage';

const refreshCartMock = vi.fn().mockResolvedValue(undefined);
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/app/providers/CartProvider', () => ({
  useCart: () => ({ refresh: refreshCartMock }),
}));

vi.mock('@/modules/cart/hooks/useSkuProducts', () => ({
  useSkuProducts: () => ({}),
}));

vi.mock('@/modules/cart/api/cartApi', () => ({
  cartApi: {
    get: vi.fn(),
  },
}));

vi.mock('@/modules/user/api/userApi', () => ({
  userApi: {
    getAddresses: vi.fn(),
  },
}));

vi.mock('../../api/orderApi', () => ({
  orderApi: {
    previewCheckout: vi.fn(),
    createOrder: vi.fn(),
  },
}));

vi.mock('@/modules/payment/api/paymentApi', () => ({
  paymentApi: {
    startPayment: vi.fn(),
    createVnpaySession: vi.fn(),
  },
}));

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.mocked(cartApi.get).mockResolvedValue({
      id: 1,
      totalItems: 1,
      totalAmount: 20000000,
      items: [
        {
          cartItemId: 11,
          variantId: 7,
          productName: 'MacBook Air M3',
          sku: 'MBA-M3',
          variantName: '16GB / 512GB',
          quantity: 1,
          unitPrice: 20000000,
          lineTotal: 20000000,
        },
      ],
    });
    vi.mocked(userApi.getAddresses).mockResolvedValue([
      {
        id: 15,
        userId: 42,
        recipientName: 'Phan Anh Khang',
        phone: '0901234567',
        street: '123 Nguyen Trai',
        ward: 'P2',
        district: 'Q5',
        city: 'TP.HCM',
        isDefault: true,
        createdAt: '2026-10-01T00:00:00Z',
      },
    ]);
  });

  it('khởi tạo payment COD và điều hướng sang chi tiết đơn khi đặt hàng COD', async () => {
    const user = userEvent.setup();
    vi.mocked(orderApi.createOrder).mockResolvedValue({
      id: 125,
      userId: 42,
      orderCode: 'ORD-125',
      status: 'WAITING_CONFIRMATION',
      totalItems: 1,
      subtotal: 20000000,
      discountAmount: 0,
      shippingFee: 0,
      totalAmount: 20000000,
      recipientName: 'Phan Anh Khang',
      recipientPhone: '0901234567',
      shippingAddress: '123 Nguyen Trai, P2, Q5, TP.HCM',
      couponCodeSnapshot: null,
      items: [],
      statusHistories: [],
      createdAt: '2026-10-15T10:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
    });
    vi.mocked(paymentApi.startPayment).mockResolvedValue({
      id: 30,
      orderId: 125,
      method: 'COD',
      amount: 20000000,
      status: 'PENDING',
      createdAt: '2026-10-15T10:00:00Z',
      expiresAt: null,
    });

    render(
      <ToastProvider>
        <MemoryRouter>
          <CheckoutPage />
        </MemoryRouter>
      </ToastProvider>
    );

    const submitBtn = await screen.findByRole('button', { name: /Đặt hàng/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(orderApi.createOrder).toHaveBeenCalled();
      expect(paymentApi.startPayment).toHaveBeenCalledWith({ orderId: 125, method: 'COD' });
      expect(navigateMock).toHaveBeenCalledWith('/orders/125');
    });
  });

  it('mở phiên thanh toán VNPay và chuyển hướng sang URL cổng VNPay khi chọn VNPAY', async () => {
    const user = userEvent.setup();
    const assignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: assignSpy },
      writable: true,
    });

    vi.mocked(orderApi.createOrder).mockResolvedValue({
      id: 126,
      userId: 42,
      orderCode: 'ORD-126',
      status: 'PENDING_PAYMENT',
      totalItems: 1,
      subtotal: 20000000,
      discountAmount: 0,
      shippingFee: 0,
      totalAmount: 20000000,
      recipientName: 'Phan Anh Khang',
      recipientPhone: '0901234567',
      shippingAddress: '123 Nguyen Trai, P2, Q5, TP.HCM',
      couponCodeSnapshot: null,
      items: [],
      statusHistories: [],
      createdAt: '2026-10-15T10:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
    });
    vi.mocked(paymentApi.startPayment).mockResolvedValue({
      id: 31,
      orderId: 126,
      method: 'VNPAY',
      amount: 20000000,
      status: 'PENDING',
      createdAt: '2026-10-15T10:00:00Z',
      expiresAt: '2026-10-15T10:15:00Z',
    });
    vi.mocked(paymentApi.createVnpaySession).mockResolvedValue({
      paymentId: 31,
      paymentUrl: 'https://sandbox.vnpayment.vn/checkout?ref=126',
      expiresAt: '2026-10-15T10:15:00Z',
    });

    render(
      <ToastProvider>
        <MemoryRouter>
          <CheckoutPage />
        </MemoryRouter>
      </ToastProvider>
    );

    const vnpayRadio = await screen.findByDisplayValue('VNPAY');
    await user.click(vnpayRadio);
    await user.click(screen.getByRole('button', { name: /Đặt hàng/i }));

    await waitFor(() => {
      expect(paymentApi.startPayment).toHaveBeenCalledWith({ orderId: 126, method: 'VNPAY' });
      expect(paymentApi.createVnpaySession).toHaveBeenCalledWith(31);
      expect(assignSpy).toHaveBeenCalledWith('https://sandbox.vnpayment.vn/checkout?ref=126');
    });
  });

  it('hiển thị cảnh báo lỗi thay vì nuốt lỗi khi khởi tạo thanh toán COD thất bại', async () => {
    const user = userEvent.setup();
    vi.mocked(orderApi.createOrder).mockResolvedValue({
      id: 127,
      userId: 42,
      orderCode: 'ORD-127',
      status: 'WAITING_CONFIRMATION',
      totalItems: 1,
      subtotal: 20000000,
      discountAmount: 0,
      shippingFee: 0,
      totalAmount: 20000000,
      recipientName: 'Phan Anh Khang',
      recipientPhone: '0901234567',
      shippingAddress: '123 Nguyen Trai, P2, Q5, TP.HCM',
      couponCodeSnapshot: null,
      items: [],
      statusHistories: [],
      createdAt: '2026-10-15T10:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
    });
    vi.mocked(paymentApi.startPayment).mockRejectedValue(new Error('Network error'));

    render(
      <ToastProvider>
        <MemoryRouter>
          <CheckoutPage />
        </MemoryRouter>
      </ToastProvider>
    );

    const submitBtn = await screen.findByRole('button', { name: /Đặt hàng/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/chưa đồng bộ trạng thái thanh toán COD/i)).toBeInTheDocument();
      expect(navigateMock).toHaveBeenCalledWith('/orders/127');
    });
  });
});
