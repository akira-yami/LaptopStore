import { expect, test } from '@playwright/test';
import { createInitialMockState, setupMockBackend } from './helpers/mockBackend';

test.describe('Luồng mua hàng E2E của Khách hàng (Customer)', () => {
  test('Đăng nhập → Giỏ hàng → Preview Coupon → Đặt đơn COD → Hủy đơn trên Chi tiết đơn', async ({ page }) => {
    const state = createInitialMockState();
    await setupMockBackend(page, state);

    // 1. Đăng nhập khách hàng
    await page.goto('/login');
    await page.getByPlaceholder('ban@example.com').fill('customer@laptopstore.vn');
    await page.getByPlaceholder('••••••••').fill('Password123!');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page).toHaveURL('/');

    // 2. Mở giỏ hàng và đi sang Checkout
    await page.goto('/cart');
    await expect(page.getByText('MacBook Air M3')).toBeVisible();
    await page.getByRole('link', { name: /Thanh toán|Tiến hành thanh toán/i }).click();
    await expect(page).toHaveURL('/checkout');

    // 3. Áp dụng mã giảm giá STUDENT500 (gọi POST /me/orders/preview)
    await page.getByPlaceholder('Nhập mã giảm giá').fill('STUDENT500');
    await page.getByRole('button', { name: 'Áp dụng' }).click();
    await expect(page.getByText(/Đã áp dụng mã STUDENT500/i)).toBeVisible();

    // 4. Đặt hàng COD -> tạo đơn + khởi tạo COD payment -> điều hướng sang chi tiết đơn
    await page.getByRole('button', { name: /Đặt hàng/i }).click();
    await expect(page).toHaveURL(/\/orders\/300$/);
    await expect(page.getByText(/Đơn #ORD-E2E-300/i)).toBeVisible();

    // 5. Khách hàng bấm Hủy đơn hàng
    await page.getByRole('button', { name: 'Hủy đơn hàng' }).click();
    await page.getByPlaceholder(/Đổi cấu hình/i).fill('Muốn nâng cấp bản 1TB');
    await page.getByRole('button', { name: 'Xác nhận hủy đơn' }).click();

    await expect(page.getByText(/Đã hủy đơn hàng #ORD-E2E-300/i)).toBeVisible();
    expect(state.orders.find((o) => o.id === 300)?.status).toBe('CANCELLED');
  });

  test('Đặt đơn VNPAY → Redirect sang cổng VNPay → Xác minh trang /payment/vnpay-return', async ({ page }) => {
    const state = createInitialMockState();
    state.currentUser = state.users[0];
    await setupMockBackend(page, state);

    await page.goto('/checkout');
    await page.locator('input[name="paymentMethod"][value="VNPAY"]').check();
    await page.getByRole('button', { name: /Đặt hàng/i }).click();

    // Mock session chuyển thẳng sang /payment/vnpay-return kèm vnp_ResponseCode=00
    await expect(page).toHaveURL(/\/payment\/vnpay-return\?.*vnp_ResponseCode=00/);
    await expect(page.getByText('Thanh toán thành công')).toBeVisible();
    await expect(page.getByText('15008888')).toBeVisible();
  });

  test('Đơn hàng đã giao (DELIVERED) → Bấm Viết đánh giá → Gửi đánh giá 5 sao', async ({ page }) => {
    const state = createInitialMockState();
    state.currentUser = state.users[0];
    await setupMockBackend(page, state);

    await page.goto('/orders/203');
    await expect(page.getByText(/Đơn #ORD-DELIVERED-203/i)).toBeVisible();

    const reviewLink = page.getByRole('link', { name: /Viết đánh giá/i });
    await expect(reviewLink).toBeVisible();
    await reviewLink.click();

    await expect(page).toHaveURL('/me/order-items/503/review');
    await page.getByRole('radio', { name: /5 sao/i }).click();
    await page.getByPlaceholder(/Hiệu năng, màn hình/i).fill('Máy chạy rất mượt, giao hàng nhanh!');
    await page.getByRole('button', { name: 'Gửi đánh giá' }).click();

    await expect(page.getByText('Cảm ơn bạn đã chia sẻ!')).toBeVisible();
    expect(state.reviews).toHaveLength(1);
    expect(state.reviews[0].rating).toBe(5);
  });

  test('Quản lý Loyalty & Coupon (/me/loyalty) → Xem điểm thưởng → Đổi điểm sang Coupon → Hiển thị ở Coupon có thể dùng', async ({ page }) => {
    const state = createInitialMockState();
    state.currentUser = state.users[0];
    await setupMockBackend(page, state);

    await page.goto('/me/loyalty');
    await expect(page.getByRole('heading', { name: 'Điểm thưởng Loyalty & Coupon' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '300 điểm' })).toBeVisible();
    await expect(page.getByText('STUDENT500')).toBeVisible();

    await page.getByTestId('redeem-tier-COUPON_120K').click();

    await expect(page.getByRole('heading', { name: '200 điểm' })).toBeVisible();
    await expect(page.getByText('LYL100-E2E999', { exact: true })).toBeVisible();
  });
});
