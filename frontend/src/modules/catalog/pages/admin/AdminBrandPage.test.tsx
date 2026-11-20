import { ToastProvider } from '@/components/ui';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { brandApi } from '../../api/brandApi';
import AdminBrandPage from './AdminBrandPage';

vi.mock('../../api/brandApi', () => ({
  brandApi: {
    getAllBrands: vi.fn(),
    createBrand: vi.fn(),
    updateBrand: vi.fn(),
    deleteBrand: vi.fn(),
  },
}));

describe('AdminBrandPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị danh sách thương hiệu và các nút thao tác Thêm/Sửa/Xóa', async () => {
    vi.mocked(brandApi.getAllBrands).mockResolvedValue([
      { id: 1, name: 'Apple', description: 'MacBook', active: true },
      { id: 2, name: 'ASUS', description: 'ROG & ZenBook', active: false },
    ]);

    render(
      <ToastProvider>
        <MemoryRouter>
          <AdminBrandPage />
        </MemoryRouter>
      </ToastProvider>
    );

    expect(screen.getByText('Hãng sản xuất')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('ASUS')).toBeInTheDocument();
      expect(screen.getByText('Đang kinh doanh')).toBeInTheDocument();
      expect(screen.getByText('Tạm ẩn')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Thêm thương hiệu/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Sửa/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /Xóa/i })).toHaveLength(2);
  });
});

