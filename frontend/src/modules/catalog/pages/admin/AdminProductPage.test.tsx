import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

  const mockProduct = {
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
  };

  it('hiển thị danh sách sản phẩm với các nút quản lý biến thể và bộ ảnh sản phẩm', async () => {
    vi.mocked(catalogApi.getBrands).mockResolvedValue([
      { id: 1, name: 'Apple', active: true },
    ]);
    vi.mocked(catalogApi.getCategories).mockResolvedValue([
      { id: 1, name: 'Ultrabook', active: true },
    ]);

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/admin/products') {
        return Promise.resolve({ data: [mockProduct] });
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

  it('mở modal quản lý biến thể và bấm nút ngừng bán biến thể', async () => {
    vi.mocked(catalogApi.getBrands).mockResolvedValue([]);
    vi.mocked(catalogApi.getCategories).mockResolvedValue([]);

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/admin/products') {
        return Promise.resolve({ data: [mockProduct] });
      }
      if (url === '/admin/products/101/variants') {
        return Promise.resolve({ data: mockProduct.variants });
      }
      return Promise.reject(new Error('not found'));
    });

    vi.mocked(apiClient.patch).mockResolvedValue({ data: 'Hủy kích hoạt thành công' });

    render(
      <ToastProvider>
        <MemoryRouter>
          <AdminProductPage />
        </MemoryRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('MacBook Air M2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /1 biến thể/i }));

    await waitFor(() => {
      expect(screen.getByText(/Biến thể: MacBook Air M2/i)).toBeInTheDocument();
      expect(screen.getByText('MBA-M2-8-256')).toBeInTheDocument();
    });

    const toggleBtn = screen.getAllByRole('button', { name: /Ngừng bán/i })[1];
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/admin/products/101/variants/1/status', null, { params: { active: false } });
    });
  });

  it('mở modal quản lý bộ ảnh, thêm ảnh và bấm Lưu bộ ảnh thành công', async () => {
    vi.mocked(catalogApi.getBrands).mockResolvedValue([]);
    vi.mocked(catalogApi.getCategories).mockResolvedValue([]);

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/admin/products') {
        return Promise.resolve({ data: [mockProduct] });
      }
      return Promise.reject(new Error('not found'));
    });

    vi.mocked(apiClient.put).mockResolvedValue({ data: mockProduct.images });

    render(
      <ToastProvider>
        <MemoryRouter>
          <AdminProductPage />
        </MemoryRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('MacBook Air M2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /2 ảnh/i }));

    await waitFor(() => {
      expect(screen.getByText(/Bộ sưu tập ảnh: MacBook Air M2/i)).toBeInTheDocument();
    });

    const urlInput = screen.getByPlaceholderText(/Ví dụ: \/uploads\/products/i);
    fireEvent.change(urlInput, { target: { value: '/uploads/products/macbook-back.jpg' } });

    fireEvent.click(screen.getByRole('button', { name: /Thêm ảnh/i }));

    const saveBtn = screen.getByRole('button', { name: /Lưu bộ ảnh/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/admin/products/101/images',
        expect.arrayContaining([
          expect.objectContaining({ imageUrl: '/uploads/products/macbook-back.jpg', isPrimary: false }),
        ])
      );
    });
  });
});
