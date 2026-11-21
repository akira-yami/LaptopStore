import { ToastProvider } from '@/components/ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    updateBrandStatus: vi.fn(),
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
    expect(screen.getAllByRole('button', { name: /Xóa/i })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Kích hoạt lại/i })).toBeInTheDocument();
  });

  it('kích hoạt lại thương hiệu đang tạm ẩn qua updateBrandStatus', async () => {
    vi.mocked(brandApi.getAllBrands).mockResolvedValue([
      { id: 2, name: 'ASUS', description: 'ROG & ZenBook', active: false },
    ]);
    vi.mocked(brandApi.updateBrandStatus).mockResolvedValue('Kích hoạt thương hiệu thành công!');

    render(
      <ToastProvider>
        <MemoryRouter>
          <AdminBrandPage />
        </MemoryRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('ASUS')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Kích hoạt lại/i }));

    await waitFor(() => {
      expect(brandApi.updateBrandStatus).toHaveBeenCalledWith(2, true);
    });
  });

  it('mở modal thêm mới, nhập dữ liệu và submit tạo thương hiệu thành công', async () => {
    vi.mocked(brandApi.getAllBrands).mockResolvedValue([]);
    vi.mocked(brandApi.createBrand).mockResolvedValue({ id: 10, name: 'Lenovo', active: true });

    render(
      <ToastProvider>
        <MemoryRouter>
          <AdminBrandPage />
        </MemoryRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Chưa có thương hiệu nào.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Thêm thương hiệu/i }));

    expect(screen.getByRole('heading', { name: 'Thêm thương hiệu' })).toBeInTheDocument();

    const inputName = screen.getByPlaceholderText(/Ví dụ: Apple, ASUS/i);
    fireEvent.change(inputName, { target: { value: 'Lenovo' } });

    const submitBtn = screen.getByRole('button', { name: /^Lưu$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(brandApi.createBrand).toHaveBeenCalledWith({
        name: 'Lenovo',
        description: undefined,
      });
    });
  });

  it('mở modal sửa thương hiệu và submit cập nhật thành công', async () => {
    vi.mocked(brandApi.getAllBrands).mockResolvedValue([
      { id: 1, name: 'Apple', description: 'MacBook', active: true },
    ]);
    vi.mocked(brandApi.updateBrand).mockResolvedValue({ id: 1, name: 'Apple Inc', active: true });

    render(
      <ToastProvider>
        <MemoryRouter>
          <AdminBrandPage />
        </MemoryRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Sửa/i }));

    expect(screen.getByRole('heading', { name: 'Sửa thương hiệu' })).toBeInTheDocument();

    const inputName = screen.getByPlaceholderText(/Ví dụ: Apple, ASUS/i);
    fireEvent.change(inputName, { target: { value: 'Apple Inc' } });

    const submitBtn = screen.getByRole('button', { name: /^Lưu$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(brandApi.updateBrand).toHaveBeenCalledWith(1, {
        name: 'Apple Inc',
        description: 'MacBook',
      });
    });
  });

  it('mở modal xác nhận xóa và xác nhận xóa thương hiệu thành công', async () => {
    vi.mocked(brandApi.getAllBrands).mockResolvedValue([
      { id: 2, name: 'Dell', description: 'XPS', active: true },
    ]);
    vi.mocked(brandApi.deleteBrand).mockResolvedValue('Xóa thành công');

    render(
      <ToastProvider>
        <MemoryRouter>
          <AdminBrandPage />
        </MemoryRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Dell')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Xóa/i }));

    expect(screen.getByText(/Xóa thương hiệu “Dell”\?/i)).toBeInTheDocument();

    const confirmBtn = screen.getAllByRole('button', { name: /^Xóa$/i })[1];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(brandApi.deleteBrand).toHaveBeenCalledWith(2);
    });
  });

  it('hiển thị thông báo lỗi khi tải danh sách thương hiệu thất bại', async () => {
    vi.mocked(brandApi.getAllBrands).mockRejectedValue(new Error('Network error'));

    render(
      <ToastProvider>
        <MemoryRouter>
          <AdminBrandPage />
        </MemoryRouter>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Không thể tải danh sách thương hiệu/i)).toBeInTheDocument();
    });
  });
});
