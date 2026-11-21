import { ToastProvider } from '@/components/ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { categoryApi } from '../../api/categoryApi';
import AdminCategoryPage from './AdminCategoryPage';

vi.mock('../../api/categoryApi', () => ({
  categoryApi: {
    getAllCategories: vi.fn(),
    getAdminCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    updateCategoryStatus: vi.fn(),
  },
}));

describe('AdminCategoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tải toàn bộ danh mục quản trị (gồm cả tạm ẩn) và hiển thị nút Kích hoạt lại cho danh mục tạm ẩn', async () => {
    vi.mocked(categoryApi.getAdminCategories).mockResolvedValue([
      { id: 1, name: 'Gaming', description: 'Laptop chơi game', active: true },
      { id: 2, name: 'Workstation', description: 'Máy trạm đồ họa', active: false },
    ]);

    render(
      <ToastProvider>
        <MemoryRouter>
          <AdminCategoryPage />
        </MemoryRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Gaming')).toBeInTheDocument();
      expect(screen.getByText('Workstation')).toBeInTheDocument();
      expect(screen.getByText('Đang hiển thị')).toBeInTheDocument();
      expect(screen.getByText('Tạm ẩn')).toBeInTheDocument();
    });

    expect(categoryApi.getAdminCategories).toHaveBeenCalledTimes(1);
    expect(categoryApi.getAllCategories).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: /Xóa/i })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Kích hoạt lại/i })).toBeInTheDocument();
  });

  it('kích hoạt lại danh mục đang tạm ẩn qua updateCategoryStatus', async () => {
    vi.mocked(categoryApi.getAdminCategories).mockResolvedValue([
      { id: 2, name: 'Workstation', description: 'Máy trạm đồ họa', active: false },
    ]);
    vi.mocked(categoryApi.updateCategoryStatus).mockResolvedValue('Kích hoạt danh mục thành công!');

    render(
      <ToastProvider>
        <MemoryRouter>
          <AdminCategoryPage />
        </MemoryRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Workstation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Kích hoạt lại/i }));

    await waitFor(() => {
      expect(categoryApi.updateCategoryStatus).toHaveBeenCalledWith(2, true);
    });
  });
});
