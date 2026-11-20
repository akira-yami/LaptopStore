import { ToastProvider } from '@/components/ui';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CartPage } from './CartPage';

const refreshMock = vi.fn().mockResolvedValue(undefined);
const setCartMock = vi.fn();

const mockCartState = {
  cart: {
    id: 1,
    totalItems: 3,
    totalAmount: 40000000,
    items: [
      {
        cartItemId: 11,
        productId: 50,
        variantId: 7,
        productName: 'MacBook Air M3',
        sku: 'MBA-M3',
        variantName: '16GB / 512GB',
        thumbnailImage: '/uploads/mba.jpg',
        quantity: 2,
        availableStock: 2,
        sellable: true,
        unitPrice: 20000000,
        lineTotal: 40000000,
      },
      {
        cartItemId: 12,
        productId: null,
        variantId: 999,
        productName: 'Sản phẩm không còn tồn tại',
        sku: '',
        variantName: '',
        thumbnailImage: null,
        quantity: 1,
        availableStock: 0,
        sellable: false,
        unitPrice: 0,
        lineTotal: 0,
      },
    ],
  },
  refresh: refreshMock,
  setCart: setCartMock,
};

vi.mock('@/app/providers/CartProvider', () => ({
  useCart: () => mockCartState,
}));

vi.mock('../api/cartApi', () => ({
  cartApi: {
    updateItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('CartPage', () => {
  it('khóa nút tăng số lượng khi chạm trần tồn kho, cảnh báo sản phẩm ngừng bán và link thẳng bằng productId', async () => {
    render(
      <ToastProvider>
        <MemoryRouter>
          <CartPage />
        </MemoryRouter>
      </ToastProvider>
    );

    const productLink = await screen.findByRole('link', { name: 'MacBook Air M3' });
    expect(productLink).toHaveAttribute('href', '/products/50');

    const increaseButtons = screen.getAllByRole('button', { name: 'Tăng số lượng' });
    expect(increaseButtons[0]).toBeDisabled();
    expect(increaseButtons[1]).toBeDisabled();

    expect(screen.getByText(/Ngừng bán \/ Hết hàng/i)).toBeInTheDocument();
    expect(screen.getByText(/Vui lòng xóa hoặc điều chỉnh sản phẩm hết hàng/i)).toBeInTheDocument();
  });
});
