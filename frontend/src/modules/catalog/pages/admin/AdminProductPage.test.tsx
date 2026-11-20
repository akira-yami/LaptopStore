import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api/apiClient';
import { catalogApi } from '../../api/catalogApi';
import AdminProductPage from './AdminProductPage';
import { ToastProvider } from '@/components/ui';

vi.mock('@/services/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../../api/catalogApi', () => ({
  catalogApi: {
    getBrands: vi.fn(),
    getCategories: vi.fn(),
  },
}));

describe('AdminProductPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị danh sách sản phẩm với các nút quản lý biến thể và bộ ảnh sản phẩm', async () => {
    vi.mocked(catalogApi.getBrands).mockResolvedValue([
      { id: 1, name: 'Apple', active: true },
    ]);
    vi.mocked(catalogApi.getCategories).mockResolvedValue([
      { id: 1, name: 'Ultrabook', active: true },
    ]);

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/admin/products') {
        return Promise.resolve({
          data: [
            {
              id: 101,
              name: 'MacBook Air M2',
              brandName: 'Apple',
              categoryName: 'Ultrabook',
              status: 'ACTIVE',
              images: [
                { id: 1, imageUrl: '/uploads/products/macbook-air.jpg', isPrimary: true },
                { id: 2, imageUrl: '/uploads/products/macbook-air-side.jpg', isPrimary: false },
              ],
              variants: [
                { id: 1, sku: 'MBA-M2-8-256', ram: '8GB', storage: '256GB', color: 'Midnight', price: 27000000, quantity: 5, status: 'ACTIVE', active: true },
              ],
            },
          ],
        });
      }
      return Promise.reject(new Error('not found'));
    });

    render(
      <ToastProvider>
        <MemoryRouter>
          <AdminProductPage />
        </MemoryRouter>
      </ToastProvider>
    );

    expect(screen.getByText('Danh mục sản phẩm')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('MacBook Air M2')).toBeInTheDocument();
      expect(screen.getByText(/1 biến thể/i)).toBeInTheDocument();
      expect(screen.getByText(/2 ảnh/i)).toBeInTheDocument();
      expect(screen.getByText('Đang bán')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Thêm sản phẩm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1 biến thể/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2 ảnh/i })).toBeInTheDocument();
  });
});
