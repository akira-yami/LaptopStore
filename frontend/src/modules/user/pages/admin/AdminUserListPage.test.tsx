import { ToastProvider } from '@/components/ui';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminUserApi } from '../../api/userApi';
import { UserProfile } from '../../types';
import { AdminUserListPage } from './AdminUserListPage';

vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 99,
      email: 'admin1@laptopstore.vn',
      fullName: 'Admin Một',
      status: 'ACTIVE',
      roles: ['ROLE_ADMIN'],
      createdAt: '2026-10-01T00:00:00Z',
    },
  }),
}));

vi.mock('../../api/userApi', () => ({
  adminUserApi: {
    getAllUsers: vi.fn(),
    updateUserStatus: vi.fn(),
    updateUserRoles: vi.fn(),
  },
}));

const usersFixture: UserProfile[] = [
  {
    id: 99,
    email: 'admin1@laptopstore.vn',
    fullName: 'Admin Một',
    status: 'ACTIVE',
    roles: ['ROLE_ADMIN'],
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 100,
    email: 'admin2@laptopstore.vn',
    fullName: 'Admin Hai',
    status: 'ACTIVE',
    roles: ['ROLE_ADMIN'],
    createdAt: '2026-10-02T00:00:00Z',
  },
  {
    id: 50,
    email: 'staff@laptopstore.vn',
    fullName: 'Nhân Viên Kho',
    status: 'ACTIVE',
    roles: ['ROLE_STAFF'],
    createdAt: '2026-10-03T00:00:00Z',
  },
  {
    id: 42,
    email: 'customer@laptopstore.vn',
    fullName: 'Khách Hàng A',
    status: 'ACTIVE',
    roles: ['ROLE_USER'],
    createdAt: '2026-10-04T00:00:00Z',
  },
];

describe('AdminUserListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminUserApi.getAllUsers).mockResolvedValue(usersFixture);
  });

  it('vô hiệu hóa nút Phân quyền và Khóa đối với chính mình và Admin ngang cấp, chỉ cho phép thao tác với cấp dưới', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <AdminUserListPage />
        </ToastProvider>
      </MemoryRouter>,
    );

    const selfRow = (await screen.findByText('admin1@laptopstore.vn')).closest('tr')!;
    expect(within(selfRow).getByRole('button', { name: 'Phân quyền' })).toBeDisabled();
    expect(within(selfRow).getByRole('button', { name: 'Khóa' })).toBeDisabled();

    const peerAdminRow = screen.getByText('admin2@laptopstore.vn').closest('tr')!;
    expect(within(peerAdminRow).getByRole('button', { name: 'Phân quyền' })).toBeDisabled();
    expect(within(peerAdminRow).getByRole('button', { name: 'Khóa' })).toBeDisabled();

    const staffRow = screen.getByText('staff@laptopstore.vn').closest('tr')!;
    expect(within(staffRow).getByRole('button', { name: 'Phân quyền' })).toBeEnabled();
    expect(within(staffRow).getByRole('button', { name: 'Khóa' })).toBeEnabled();

    const userRow = screen.getByText('customer@laptopstore.vn').closest('tr')!;
    expect(within(userRow).getByRole('button', { name: 'Phân quyền' })).toBeEnabled();
    expect(within(userRow).getByRole('button', { name: 'Khóa' })).toBeEnabled();
  });
});
