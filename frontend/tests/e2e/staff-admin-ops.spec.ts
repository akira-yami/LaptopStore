import { expect, test } from '@playwright/test';
import { createInitialMockState, setupMockBackend } from './helpers/mockBackend';

test.describe('Luồng vận hành E2E của Staff / Admin', () => {
  test('Admin đăng nhập → Dashboard tổng hợp → Xử lý đơn & Thu tiền COD', async ({ page }) => {
    const state = createInitialMockState();
    await setupMockBackend(page, state);

    // 1. Đăng nhập Admin -> tự điều hướng tới /admin/dashboard
    await page.goto('/login');
    await page.getByPlaceholder('ban@example.com').fill('admin@laptopstore.vn');
    await page.getByPlaceholder('••••••••').fill('Admin123!');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    await expect(page).toHaveURL('/admin/dashboard');
    await expect(page.getByText('Tổng quan quản trị')).toBeVisible();
    await expect(page.getByText('30.000.000 ₫').first()).toBeVisible();

    // 2. Mở màn quản lý đơn hàng
    await page.goto('/admin/orders');
    await expect(page.getByText('#ORD-VNPAY-201')).toBeVisible();

    // Đơn PENDING_PAYMENT không được có nút xác nhận tay
    const vnpayRow = page.locator('tr', { hasText: '#ORD-VNPAY-201' });
    await expect(vnpayRow.getByRole('button', { name: 'Đã xác nhận' })).toHaveCount(0);
    await expect(vnpayRow.getByRole('button', { name: 'Đã hủy' })).toBeVisible();

    // Đơn WAITING_CONFIRMATION có thể xác nhận sang CONFIRMED
    const codPendingRow = page.locator('tr', { hasText: '#ORD-COD-202' });
    await codPendingRow.getByRole('button', { name: 'Đã xác nhận' }).click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(page.getByText(/Đơn #ORD-COD-202/i)).toBeVisible();
    expect(state.orders.find((o) => o.id === 202)?.status).toBe('CONFIRMED');

    // Đơn DELIVERED có nút Thu tiền COD
    const deliveredRow = page.locator('tr', { hasText: '#ORD-DELIVERED-203' });
    await deliveredRow.getByRole('button', { name: 'Thu tiền COD' }).click();
    await page.getByRole('button', { name: 'Xác nhận đã thu tiền' }).click();
    await expect(page.getByText(/Đã xác nhận thu tiền COD cho đơn #ORD-DELIVERED-203/i)).toBeVisible();
    expect(state.payments.find((p) => p.orderId === 203)?.status).toBe('PAID');
  });

  test('Admin quản lý người dùng (/admin/users) và tạo mã giảm giá thật (/admin/promotions)', async ({ page }) => {
    const state = createInitialMockState();
    state.currentUser = state.users[1]; // Admin
    await setupMockBackend(page, state);

    // 1. Phân quyền người dùng trên /admin/users
    await page.goto('/admin/users');
    await expect(page.getByText('Quản lý người dùng')).toBeVisible();
    const customerRow = page.locator('tr', { hasText: 'customer@laptopstore.vn' });
    await customerRow.getByRole('button', { name: 'Phân quyền' }).click();
    await page.getByLabel(/Nhân viên \(ROLE_STAFF\)/i).check();
    await page.getByRole('button', { name: 'Lưu vai trò' }).click();

    await expect(page.getByText(/Đã cập nhật vai trò cho customer@laptopstore.vn/i)).toBeVisible();
    expect(state.users[0].roles).toContain('ROLE_STAFF');

    // 2. Tạo mã giảm giá mới trên /admin/promotions (API thật, không còn mockStore)
    await page.goto('/admin/promotions');
    await expect(page.getByText('STUDENT500')).toBeVisible();
    await page.getByRole('button', { name: 'Tạo mã giảm giá' }).click();
    await expect(page).toHaveURL('/admin/promotions/new');

    await page.getByPlaceholder('VD: LAPTOP500').fill('E2ESALE');
    await page.getByPlaceholder('500.000').fill('300000');
    const dateInputs = page.locator('input[type="datetime-local"]');
    await dateInputs.nth(0).fill('2026-11-01T00:00');
    await dateInputs.nth(1).fill('2026-12-31T23:59');
    await page.getByRole('button', { name: 'Lưu mã giảm giá' }).click();

    await expect(page).toHaveURL('/admin/promotions');
    await expect(page.getByRole('cell', { name: 'E2ESALE' })).toBeVisible();
  });
});
