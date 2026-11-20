import { Page, Route } from '@playwright/test';

export type MockRole = 'ROLE_USER' | 'ROLE_STAFF' | 'ROLE_ADMIN';

interface MockOrderItem {
  id: number;
  productId: number;
  variantId: number;
  productName: string;
  variantName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

interface MockOrder {
  id: number;
  userId: number;
  orderCode: string;
  status: string;
  totalItems: number;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  couponCodeSnapshot: string | null;
  items: MockOrderItem[];
  statusHistories: Array<{
    id: number;
    fromStatus: string | null;
    toStatus: string;
    changedAt: string;
    changedBy: number | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface MockBackendState {
  currentUser: {
    id: number;
    email: string;
    fullName: string;
    phone: string;
    status: string;
    roles: MockRole[];
    createdAt: string;
  } | null;
  cartItems: Array<{
    cartItemId: number;
    productId?: number | null;
    variantId: number;
    productName: string;
    sku: string;
    variantName: string;
    thumbnailImage?: string | null;
    quantity: number;
    availableStock?: number | null;
    sellable?: boolean;
    unitPrice: number;
    lineTotal: number;
  }>;
  orders: MockOrder[];
  payments: Array<{
    id: number;
    orderId: number;
    method: 'COD' | 'VNPAY';
    amount: number;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
    createdAt: string;
    expiresAt: string | null;
  }>;
  users: Array<{
    id: number;
    email: string;
    fullName: string;
    phone: string;
    status: string;
    roles: MockRole[];
    createdAt: string;
  }>;
  coupons: Array<{
    id: number;
    code: string;
    discountType: 'FIXED' | 'PERCENT';
    discountValue: number;
    maxDiscount: number | null;
    minOrderAmount: number | null;
    usageLimit: number | null;
    usagePerUser: number | null;
    startsAt: string;
    endsAt: string;
    active: boolean;
  }>;
  reviews: Array<{
    id: number;
    orderItemId: number;
    productId: number;
    variantId: number;
    productName: string;
    variantName: string;
    rating: number;
    comment: string | null;
    visible: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  lastVnpaySessionUrl: string | null;
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

export function createInitialMockState(): MockBackendState {
  const now = '2026-11-19T10:00:00Z';
  return {
    currentUser: null,
    cartItems: [
      {
        cartItemId: 11,
        productId: 10,
        variantId: 7,
        productName: 'MacBook Air M3',
        sku: 'MBA-M3-16-512',
        variantName: '16GB / 512GB / Silver',
        thumbnailImage: null,
        quantity: 1,
        availableStock: 10,
        sellable: true,
        unitPrice: 28000000,
        lineTotal: 28000000,
      },
    ],
    orders: [
      {
        id: 201,
        userId: 42,
        orderCode: 'ORD-VNPAY-201',
        status: 'PENDING_PAYMENT',
        totalItems: 1,
        subtotal: 25000000,
        discountAmount: 0,
        shippingFee: 0,
        totalAmount: 25000000,
        recipientName: 'Khách Online',
        recipientPhone: '0901111111',
        shippingAddress: '10 Lê Lợi, Q1, TP.HCM',
        couponCodeSnapshot: null,
        items: [
          {
            id: 501,
            productId: 10,
            variantId: 7,
            productName: 'MacBook Air M3',
            variantName: '16GB / 512GB / Silver',
            sku: 'MBA-M3-16-512',
            unitPrice: 25000000,
            quantity: 1,
            lineTotal: 25000000,
          },
        ],
        statusHistories: [
          { id: 1, fromStatus: null, toStatus: 'PENDING_PAYMENT', changedAt: now, changedBy: 42 },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 202,
        userId: 42,
        orderCode: 'ORD-COD-202',
        status: 'WAITING_CONFIRMATION',
        totalItems: 1,
        subtotal: 22000000,
        discountAmount: 0,
        shippingFee: 0,
        totalAmount: 22000000,
        recipientName: 'Khách COD Chờ Duyệt',
        recipientPhone: '0902222222',
        shippingAddress: '20 Nguyễn Trãi, Q5, TP.HCM',
        couponCodeSnapshot: null,
        items: [
          {
            id: 502,
            productId: 10,
            variantId: 7,
            productName: 'ThinkPad X1 Carbon',
            variantName: '16GB / 512GB / Black',
            sku: 'TP-X1-16-512',
            unitPrice: 22000000,
            quantity: 1,
            lineTotal: 22000000,
          },
        ],
        statusHistories: [
          { id: 2, fromStatus: null, toStatus: 'WAITING_CONFIRMATION', changedAt: now, changedBy: 42 },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 203,
        userId: 42,
        orderCode: 'ORD-DELIVERED-203',
        status: 'DELIVERED',
        totalItems: 1,
        subtotal: 30000000,
        discountAmount: 0,
        shippingFee: 0,
        totalAmount: 30000000,
        recipientName: 'Khách Đã Giao',
        recipientPhone: '0903333333',
        shippingAddress: '30 Võ Văn Tần, Q3, TP.HCM',
        couponCodeSnapshot: null,
        items: [
          {
            id: 503,
            productId: 10,
            variantId: 7,
            productName: 'Dell XPS 13',
            variantName: '16GB / 1TB / Platinum',
            sku: 'XPS-13-16-1TB',
            unitPrice: 30000000,
            quantity: 1,
            lineTotal: 30000000,
          },
        ],
        statusHistories: [
          { id: 3, fromStatus: 'SHIPPING', toStatus: 'DELIVERED', changedAt: now, changedBy: 99 },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
    payments: [
      {
        id: 901,
        orderId: 203,
        method: 'COD',
        amount: 30000000,
        status: 'PENDING',
        createdAt: now,
        expiresAt: null,
      },
    ],
    users: [
      {
        id: 42,
        email: 'customer@laptopstore.vn',
        fullName: 'Phan Anh Khang',
        phone: '0901234567',
        status: 'ACTIVE',
        roles: ['ROLE_USER'],
        createdAt: now,
      },
      {
        id: 99,
        email: 'admin@laptopstore.vn',
        fullName: 'Quản Trị Viên',
        phone: '0909999999',
        status: 'ACTIVE',
        roles: ['ROLE_ADMIN'],
        createdAt: now,
      },
      {
        id: 100,
        email: 'admin2@laptopstore.vn',
        fullName: 'Quản Trị Viên 2',
        phone: '0908888888',
        status: 'ACTIVE',
        roles: ['ROLE_ADMIN'],
        createdAt: now,
      },
    ],
    coupons: [
      {
        id: 1,
        code: 'STUDENT500',
        discountType: 'FIXED',
        discountValue: 500000,
        maxDiscount: 500000,
        minOrderAmount: 10000000,
        usageLimit: 100,
        usagePerUser: 2,
        startsAt: '2026-01-01T00:00:00Z',
        endsAt: '2026-12-31T23:59:59Z',
        active: true,
      },
    ],
    reviews: [],
    lastVnpaySessionUrl: null,
  };
}

export async function setupMockBackend(page: Page, state: MockBackendState = createInitialMockState()) {
  let nextOrderId = 300;
  let nextPaymentId = 950;
  let nextCouponId = 10;
  let nextReviewId = 100;

  const addresses = [
    {
      id: 15,
      userId: 42,
      recipientName: 'Phan Anh Khang',
      phone: '0901234567',
      street: '123 Nguyễn Trãi',
      ward: 'Phường 2',
      district: 'Quận 5',
      city: 'TP. Hồ Chí Minh',
      postalCode: '700000',
      isDefault: true,
      createdAt: '2026-10-01T00:00:00Z',
    },
  ];

  await page.route('**/api/v1/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = req.method();

    // Auth
    if (path === '/auth/refresh' && method === 'POST') {
      if (!state.currentUser) return json(route, { message: 'Unauthenticated' }, 401);
      return json(route, { accessToken: 'e2e-access-token' });
    }
    if (path === '/auth/login' && method === 'POST') {
      const body = req.postDataJSON() as { email: string };
      const found = state.users.find((u) => u.email === body.email);
      if (!found) return json(route, { message: 'Sai thông tin đăng nhập' }, 401);
      state.currentUser = found;
      return json(route, { accessToken: 'e2e-access-token', user: found });
    }
    if (path === '/auth/logout' && method === 'POST') {
      state.currentUser = null;
      return route.fulfill({ status: 204 });
    }

    // User profile & addresses
    if (path === '/me' && method === 'GET') {
      if (!state.currentUser) return json(route, { message: 'Unauthorized' }, 401);
      return json(route, state.currentUser);
    }
    if (path === '/me/addresses' && method === 'GET') {
      return json(route, addresses);
    }

    // Admin Users
    const rankOf = (roles: MockRole[]) =>
      roles.reduce((max, r) => Math.max(max, r === 'ROLE_ADMIN' ? 3 : r === 'ROLE_STAFF' ? 2 : 1), 0);

    if (path === '/admin/users' && method === 'GET') {
      return json(route, state.users);
    }
    const userStatusMatch = path.match(/^\/admin\/users\/(\d+)\/status$/);
    if (userStatusMatch && method === 'PATCH') {
      const id = Number(userStatusMatch[1]);
      const body = req.postDataJSON() as { status: string };
      const user = state.users.find((u) => u.id === id);
      if (!user) return json(route, { message: 'Not found' }, 404);
      const actorRank = state.currentUser ? rankOf(state.currentUser.roles) : 0;
      if (!state.currentUser || state.currentUser.id === id || rankOf(user.roles) >= actorRank) {
        return json(route, { message: 'Role ngang cấp hoặc thấp hơn không có quyền thay đổi tài khoản này' }, 403);
      }
      user.status = body.status;
      return json(route, user);
    }
    const userRoleMatch = path.match(/^\/admin\/users\/(\d+)\/roles$/);
    if (userRoleMatch && method === 'PATCH') {
      const id = Number(userRoleMatch[1]);
      const body = req.postDataJSON() as { roles: MockRole[] };
      const user = state.users.find((u) => u.id === id);
      if (!user) return json(route, { message: 'Not found' }, 404);
      const actorRank = state.currentUser ? rankOf(state.currentUser.roles) : 0;
      if (!state.currentUser || state.currentUser.id === id || rankOf(user.roles) >= actorRank) {
        return json(route, { message: 'Role ngang cấp hoặc thấp hơn không có quyền thay đổi tài khoản này' }, 403);
      }
      user.roles = body.roles;
      return json(route, user);
    }

    // Catalog & Inventory
    if (path === '/brands' && method === 'GET') return json(route, [{ id: 1, name: 'Apple', active: true }]);
    if (path === '/categories' && method === 'GET') return json(route, [{ id: 1, name: 'Ultrabook', active: true }]);
    if (path === '/products/search' && method === 'GET') {
      return json(route, {
        content: [
          {
            id: 10,
            name: 'MacBook Air M3',
            brandName: 'Apple',
            categoryName: 'Ultrabook',
            minPrice: 28000000,
            thumbnailImage: null,
            status: 'ACTIVE',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 12,
      });
    }
    if (path === '/products' && method === 'GET') return json(route, []);
    if (path === '/products/10' && method === 'GET') {
      return json(route, { id: 10, name: 'MacBook Air M3', status: 'ACTIVE', variants: [] });
    }
    if (path.startsWith('/staff/inventory/low-stock') && method === 'GET') {
      return json(route, [
        { variantId: 7, sku: 'MBA-M3-16-512', productName: 'MacBook Air M3', variantName: '16GB/512GB', quantity: 2 },
      ]);
    }

    // Cart
    if (path === '/me/cart' && method === 'GET') {
      const totalItems = state.cartItems.reduce((sum, i) => sum + i.quantity, 0);
      const totalAmount = state.cartItems.reduce((sum, i) => sum + i.lineTotal, 0);
      return json(route, { id: 1, items: state.cartItems, totalItems, totalAmount });
    }

    // Checkout Preview & Create Order
    if (path === '/me/orders/preview' && method === 'POST') {
      const body = req.postDataJSON() as { couponCode?: string; paymentMethod?: 'COD' | 'VNPAY' };
      const subtotal = state.cartItems.reduce((sum, i) => sum + i.lineTotal, 0);
      const coupon = body.couponCode
        ? state.coupons.find((c) => c.code.toUpperCase() === body.couponCode!.toUpperCase() && c.active)
        : null;
      if (body.couponCode && !coupon) {
        return json(route, { message: 'Mã giảm giá không tồn tại' }, 422);
      }
      const discountAmount = coupon ? coupon.discountValue : 0;
      return json(route, {
        addressId: 15,
        recipientName: 'Phan Anh Khang',
        recipientPhone: '0901234567',
        shippingAddress: '123 Nguyễn Trãi, Phường 2, Quận 5, TP. Hồ Chí Minh, 700000',
        paymentMethod: body.paymentMethod ?? 'COD',
        couponCode: coupon?.code ?? null,
        subtotal,
        discountAmount,
        shippingFee: 0,
        totalAmount: Math.max(0, subtotal - discountAmount),
        totalItems: state.cartItems.reduce((sum, i) => sum + i.quantity, 0),
        items: [],
      });
    }

    if (path === '/me/orders' && method === 'POST') {
      const body = req.postDataJSON() as { paymentMethod?: 'COD' | 'VNPAY'; couponCode?: string };
      const subtotal = state.cartItems.reduce((sum, i) => sum + i.lineTotal, 0);
      const coupon = body.couponCode
        ? state.coupons.find((c) => c.code.toUpperCase() === body.couponCode!.toUpperCase() && c.active)
        : null;
      const discountAmount = coupon ? coupon.discountValue : 0;
      const orderId = nextOrderId++;
      const status = body.paymentMethod === 'VNPAY' ? 'PENDING_PAYMENT' : 'WAITING_CONFIRMATION';
      const now = new Date().toISOString();
      const created: MockOrder = {
        id: orderId,
        userId: state.currentUser?.id ?? 42,
        orderCode: `ORD-E2E-${orderId}`,
        status,
        totalItems: state.cartItems.reduce((sum, i) => sum + i.quantity, 0),
        subtotal,
        discountAmount,
        shippingFee: 0,
        totalAmount: Math.max(0, subtotal - discountAmount),
        recipientName: 'Phan Anh Khang',
        recipientPhone: '0901234567',
        shippingAddress: '123 Nguyễn Trãi, Phường 2, Quận 5, TP. Hồ Chí Minh, 700000',
        couponCodeSnapshot: coupon?.code ?? null,
        items: state.cartItems.map((ci, idx) => ({
          id: orderId * 10 + idx,
          productId: 10,
          variantId: ci.variantId,
          productName: ci.productName,
          variantName: ci.variantName,
          sku: ci.sku,
          unitPrice: ci.unitPrice,
          quantity: ci.quantity,
          lineTotal: ci.lineTotal,
        })),
        statusHistories: [{ id: orderId * 10, fromStatus: null, toStatus: status, changedAt: now, changedBy: 42 }],
        createdAt: now,
        updatedAt: now,
      };
      state.orders.unshift(created);
      state.cartItems = [];
      return json(route, created, 201);
    }

    if (path === '/me/orders' && method === 'GET') {
      const statuses = url.searchParams.getAll('status');
      const filtered = statuses.length > 0
        ? state.orders.filter((o) => statuses.includes(o.status))
        : state.orders;
      return json(route, {
        content: filtered,
        totalElements: filtered.length,
        totalPages: 1,
        number: 0,
        size: 20,
      });
    }

    const myOrderMatch = path.match(/^\/me\/orders\/(\d+)$/);
    if (myOrderMatch && method === 'GET') {
      const order = state.orders.find((o) => o.id === Number(myOrderMatch[1]));
      return order ? json(route, order) : json(route, { message: 'Order not found' }, 404);
    }

    const cancelOrderMatch = path.match(/^\/me\/orders\/(\d+)\/cancel$/);
    if (cancelOrderMatch && method === 'POST') {
      const order = state.orders.find((o) => o.id === Number(cancelOrderMatch[1]));
      if (!order) return json(route, { message: 'Order not found' }, 404);
      order.status = 'CANCELLED';
      order.updatedAt = new Date().toISOString();
      order.statusHistories.unshift({
        id: Date.now(),
        fromStatus: 'WAITING_CONFIRMATION',
        toStatus: 'CANCELLED',
        changedAt: order.updatedAt,
        changedBy: 42,
      });
      return json(route, order);
    }

    // Staff Orders & Dashboard Summary
    if (path === '/staff/orders/summary' && method === 'GET') {
      const pendingCount = state.orders.filter((o) =>
        ['CREATED', 'PENDING_PAYMENT', 'WAITING_CONFIRMATION'].includes(o.status)
      ).length;
      const inProgressCount = state.orders.filter((o) =>
        ['CONFIRMED', 'PACKING', 'SHIPPING'].includes(o.status)
      ).length;
      const delivered = state.orders.filter((o) => o.status === 'DELIVERED');
      return json(route, {
        totalOrders: state.orders.length,
        pendingCount,
        inProgressCount,
        deliveredCount: delivered.length,
        deliveredRevenue: delivered.reduce((s, o) => s + o.totalAmount, 0),
      });
    }

    if (path === '/staff/orders' && method === 'GET') {
      const statusParam = url.searchParams.get('status');
      const keywordParam = (url.searchParams.get('keyword') ?? '').trim().toLowerCase();
      const filtered = state.orders.filter((o) =>
        (!statusParam || o.status === statusParam)
        && (!keywordParam || o.orderCode.toLowerCase().includes(keywordParam) || o.recipientName.toLowerCase().includes(keywordParam))
      );
      return json(route, {
        content: filtered,
        totalElements: filtered.length,
        totalPages: 1,
        number: 0,
        size: 20,
      });
    }

    const staffOrderStatusMatch = path.match(/^\/staff\/orders\/(\d+)\/status$/);
    if (staffOrderStatusMatch && method === 'PUT') {
      const order = state.orders.find((o) => o.id === Number(staffOrderStatusMatch[1]));
      if (!order) return json(route, { message: 'Not found' }, 404);
      const body = req.postDataJSON() as { status: string };
      order.status = body.status;
      order.updatedAt = new Date().toISOString();
      return json(route, order);
    }

    // Payments
    if (path === '/payments' && method === 'POST') {
      const body = req.postDataJSON() as { orderId: number; method: 'COD' | 'VNPAY' };
      const order = state.orders.find((o) => o.id === body.orderId);
      const pay = {
        id: nextPaymentId++,
        orderId: body.orderId,
        method: body.method,
        amount: order?.totalAmount ?? 0,
        status: 'PENDING' as const,
        createdAt: new Date().toISOString(),
        expiresAt: body.method === 'VNPAY' ? new Date(Date.now() + 15 * 60_000).toISOString() : null,
      };
      state.payments.push(pay);
      return json(route, pay, 201);
    }

    const paymentByOrderMatch = path.match(/^\/payments\/order\/(\d+)$/);
    if (paymentByOrderMatch && method === 'GET') {
      const pay = state.payments.find((p) => p.orderId === Number(paymentByOrderMatch[1]));
      return pay ? json(route, pay) : json(route, { message: 'Not found' }, 404);
    }

    if (path === '/payments/staff/by-orders' && method === 'GET') {
      const ids = url.searchParams.getAll('orderIds').map(Number).filter((id) => !Number.isNaN(id));
      const matched = ids.length > 0
        ? state.payments.filter((p) => ids.includes(p.orderId))
        : [];
      return json(route, matched);
    }

    const vnpaySessionMatch = path.match(/^\/payments\/(\d+)\/vnpay-session$/);
    if (vnpaySessionMatch && method === 'POST') {
      const paymentId = Number(vnpaySessionMatch[1]);
      const redirectUrl = `${url.origin}/payment/vnpay-return?vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_TxnRef=E2E-${paymentId}&vnp_TransactionNo=15008888`;
      state.lastVnpaySessionUrl = redirectUrl;
      return json(route, {
        paymentId,
        paymentUrl: redirectUrl,
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      });
    }

    if (path === '/payments/vnpay/return' && method === 'GET') {
      const code = url.searchParams.get('vnp_ResponseCode');
      const ref = url.searchParams.get('vnp_TxnRef');
      const no = url.searchParams.get('vnp_TransactionNo');
      const successful = code === '00';
      return json(route, {
        signatureValid: true,
        successful,
        transactionRef: ref,
        responseCode: code,
        transactionStatus: code,
        transactionNo: no,
        message: successful ? 'Thanh toán VNPay thành công' : 'Giao dịch thất bại',
      });
    }

    if (path === '/payments/cod' && method === 'PUT') {
      const body = req.postDataJSON() as { orderId: number };
      const pay = state.payments.find((p) => p.orderId === body.orderId);
      if (!pay) return json(route, { message: 'Payment not found' }, 404);
      pay.status = 'PAID';
      return json(route, pay);
    }

    // Promotions
    if (path === '/admin/coupons' && method === 'GET') return json(route, state.coupons);
    if (path === '/admin/coupons' && method === 'POST') {
      const body = req.postDataJSON() as Record<string, unknown>;
      const created = {
        id: nextCouponId++,
        code: String(body.code),
        discountType: (body.discountType as 'FIXED' | 'PERCENT') ?? 'FIXED',
        discountValue: Number(body.discountValue ?? 0),
        maxDiscount: body.maxDiscount != null ? Number(body.maxDiscount) : null,
        minOrderAmount: body.minOrderAmount != null ? Number(body.minOrderAmount) : null,
        usageLimit: body.usageLimit != null ? Number(body.usageLimit) : null,
        usagePerUser: body.usagePerUser != null ? Number(body.usagePerUser) : null,
        startsAt: String(body.startsAt),
        endsAt: String(body.endsAt),
        active: true,
      };
      state.coupons.unshift(created);
      return json(route, created, 201);
    }
    if (path === '/admin/coupon-usages' && method === 'GET') return json(route, []);

    if (path === '/me/coupons/available' && method === 'GET') {
      return json(
        route,
        state.coupons.filter((c) => c.active).map((c) => ({
          ...c,
          remainingTotalUses: c.usageLimit ?? 1,
          remainingUserUses: c.usagePerUser ?? 1,
          personal: c.code.startsWith('LYL'),
        })),
      );
    }

    if (path === '/me/loyalty' && method === 'GET') {
      const pointsBalance = (state as unknown as { loyaltyBalance?: number }).loyaltyBalance ?? 300;
      const totalRedeemed = (state as unknown as { loyaltyRedeemed?: number }).loyaltyRedeemed ?? 0;
      return json(route, {
        pointsBalance,
        totalEarned: 300,
        totalRedeemed,
        vndPerPoint: 100000,
        rewardTiers: [
          {
            tierCode: 'COUPON_50K',
            title: 'Voucher giảm 50.000 ₫',
            pointsCost: 50,
            discountType: 'FIXED',
            discountValue: 50000,
            minOrderAmount: 500000,
            validDays: 30,
            description: 'Giảm 50.000 ₫ cho đơn hàng từ 500.000 ₫ (Hiệu lực 30 ngày)',
          },
          {
            tierCode: 'COUPON_120K',
            title: 'Voucher giảm 120.000 ₫',
            pointsCost: 100,
            discountType: 'FIXED',
            discountValue: 120000,
            minOrderAmount: 1000000,
            validDays: 30,
            description: 'Giảm 120.000 ₫ cho đơn hàng từ 1.000.000 ₫ (Hiệu lực 30 ngày)',
          },
          {
            tierCode: 'COUPON_300K',
            title: 'Voucher giảm 300.000 ₫',
            pointsCost: 200,
            discountType: 'FIXED',
            discountValue: 300000,
            minOrderAmount: 2000000,
            validDays: 30,
            description: 'Giảm 300.000 ₫ cho đơn hàng từ 2.000.000 ₫ (Hiệu lực 30 ngày)',
          },
          {
            tierCode: 'COUPON_800K',
            title: 'Voucher giảm 800.000 ₫',
            pointsCost: 500,
            discountType: 'FIXED',
            discountValue: 800000,
            minOrderAmount: 5000000,
            validDays: 30,
            description: 'Giảm 800.000 ₫ cho đơn hàng từ 5.000.000 ₫ (Hiệu lực 30 ngày)',
          },
        ],
        availableCoupons: state.coupons.filter((c) => c.active).map((c) => ({
          ...c,
          remainingTotalUses: c.usageLimit ?? 1,
          remainingUserUses: c.usagePerUser ?? 1,
          personal: c.code.startsWith('LYL'),
        })),
        transactions: [
          {
            id: 1,
            type: 'EARN_ORDER',
            pointsDelta: 300,
            balanceAfter: 300,
            referenceType: 'ORDER',
            referenceId: 'ORD-DELIVERED-203',
            description: 'Tích điểm từ đơn hàng #ORD-DELIVERED-203',
            createdAt: '2026-11-20T09:00:00Z',
          },
        ],
      });
    }

    if (path === '/me/loyalty/redeem' && method === 'POST') {
      const body = req.postDataJSON() as { tierCode: string };
      const cost = body.tierCode === 'COUPON_120K' ? 100 : 50;
      const discount = body.tierCode === 'COUPON_120K' ? 120000 : 50000;
      const minOrder = body.tierCode === 'COUPON_120K' ? 1000000 : 500000;
      const currentBalance = (state as unknown as { loyaltyBalance?: number }).loyaltyBalance ?? 300;
      if (currentBalance < cost) {
        return json(route, { message: 'Số dư điểm Loyalty không đủ để đổi voucher này' }, 400);
      }
      const nextBalance = currentBalance - cost;
      const nextRedeemed = ((state as unknown as { loyaltyRedeemed?: number }).loyaltyRedeemed ?? 0) + cost;
      (state as unknown as { loyaltyBalance?: number }).loyaltyBalance = nextBalance;
      (state as unknown as { loyaltyRedeemed?: number }).loyaltyRedeemed = nextRedeemed;

      const createdCoupon = {
        id: nextCouponId++,
        code: `LYL${cost}-E2E999`,
        discountType: 'FIXED' as const,
        discountValue: discount,
        maxDiscount: null,
        minOrderAmount: minOrder,
        usageLimit: 1,
        usagePerUser: 1,
        startsAt: '2026-01-01T00:00:00Z',
        endsAt: '2026-12-31T23:59:59Z',
        active: true,
      };
      state.coupons.unshift(createdCoupon);
      return json(route, {
        coupon: { ...createdCoupon, remainingTotalUses: 1, remainingUserUses: 1, personal: true },
        pointsBalance: nextBalance,
        totalRedeemed: nextRedeemed,
        message: `Đổi điểm thành công! Mã coupon của bạn là ${createdCoupon.code}`,
      });
    }

    // Reviews
    if (path === '/me/reviews' && method === 'GET') {
      return json(route, { content: state.reviews, totalElements: state.reviews.length, totalPages: 1, number: 0, size: 100 });
    }
    if (path === '/me/reviews' && method === 'POST') {
      const body = req.postDataJSON() as { orderItemId: number; rating: number; comment?: string };
      const created = {
        id: nextReviewId++,
        orderItemId: body.orderItemId,
        productId: 10,
        variantId: 7,
        productName: 'Dell XPS 13',
        variantName: '16GB / 1TB / Platinum',
        rating: body.rating,
        comment: body.comment ?? null,
        visible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.reviews.unshift(created);
      return json(route, created, 201);
    }

    return json(route, { message: `Unhandled mock route: ${method} ${path}` }, 404);
  });

  return state;
}
