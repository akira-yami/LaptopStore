import { useCart } from '@/app/providers/CartProvider';
import { apiErrorMessage, Badge, EmptyState, formatMoney, Icon, PageHeading, ProductImage, Spinner, useToast } from '@/components/ui';
import { cartApi } from '@/modules/cart/api/cartApi';
import { Cart } from '@/modules/cart/types';
import { userApi } from '@/modules/user/api/userApi';
import { Address } from '@/modules/user/types';
import { paymentApi } from '@/modules/payment/api/paymentApi';
import { storeCreditApi } from '@/modules/payment/api/storeCreditApi';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import { CheckoutPaymentMethod, CheckoutPreviewResponse } from '../../types';

const formatSavedAddress = (address: Address) =>
  [address.street, address.ward, address.district, address.city, address.postalCode]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(', ');

const createIdempotencyKey = () =>
  `checkout-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { refresh: refreshCart } = useCart();

  const selectedCartItemIds = useMemo(() => {
    const raw = searchParams.get('items');
    if (!raw) return null;
    const parsed = raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    return parsed.length > 0 ? Array.from(new Set(parsed)) : null;
  }, [searchParams]);

  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [useSavedAddress, setUseSavedAddress] = useState<boolean>(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('COD');
  const [storeCreditBalance, setStoreCreditBalance] = useState<number | null>(null);
  const [storeCreditLoading, setStoreCreditLoading] = useState(true);
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [note, setNote] = useState<string>('');

  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => createIdempotencyKey());
  const [loading, setLoading] = useState<boolean>(true);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  // Tự động làm mới Idempotency-Key khi người dùng đổi bất kỳ dữ liệu cốt lõi nào của đơn hàng,
  // tránh dính lỗi 409 IDEMPOTENCY_CONFLICT ngoài ý muốn sau khi chỉnh lại form.
  useEffect(() => {
    setIdempotencyKey(createIdempotencyKey());
  }, [
    useSavedAddress,
    selectedAddressId,
    recipientName,
    recipientPhone,
    shippingAddress,
    paymentMethod,
    appliedCouponCode,
    selectedCartItemIds,
  ]);

  const loadCheckoutData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [cartData, addressList] = await Promise.all([
        cartApi.get(),
        userApi.getAddresses().catch(() => [] as Address[]),
      ]);
      setCart(cartData);
      setAddresses(addressList);

      if (addressList.length > 0) {
        const defaultAddress = addressList.find((addr) => addr.isDefault) ?? addressList[0];
        setUseSavedAddress(true);
        setSelectedAddressId(defaultAddress.id);
      }
    } catch {
      setError('Không thể tải thông tin giỏ hàng để thanh toán. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCheckoutData();
  }, [loadCheckoutData]);

  useEffect(() => {
    let active = true;
    storeCreditApi.getWallet().then((wallet) => {
      if (active) setStoreCreditBalance(wallet.balance);
    }).catch(() => {
      if (active) setStoreCreditBalance(null);
    }).finally(() => {
      if (active) setStoreCreditLoading(false);
    });
    return () => { active = false; };
  }, []);

  const addressPayload = () => ({
    addressId: useSavedAddress ? selectedAddressId : null,
    recipientName: useSavedAddress ? undefined : recipientName.trim(),
    recipientPhone: useSavedAddress ? undefined : recipientPhone.trim(),
    shippingAddress: useSavedAddress ? undefined : shippingAddress.trim(),
  });

  const handlePreviewCoupon = async () => {
    try {
      setPreviewLoading(true);
      setError(null);
      setCouponMessage(null);
      const result = await orderApi.previewCheckout({
        ...addressPayload(),
        paymentMethod,
        couponCode: couponCode.trim() || undefined,
        cartItemIds: selectedCartItemIds ?? undefined,
      });
      setPreview(result);
      setAppliedCouponCode(result.couponCode ?? null);
      setIdempotencyKey(createIdempotencyKey());
      setCouponMessage(result.couponCode
        ? `Đã áp dụng mã ${result.couponCode}: giảm ${formatMoney(result.discountAmount)}`
        : 'Đã cập nhật tạm tính đơn hàng.');
    } catch (err) {
      setPreview(null);
      setAppliedCouponCode(null);
      setError(apiErrorMessage(err, 'Mã giảm giá không hợp lệ hoặc giỏ hàng có sản phẩm vượt quá tồn kho.'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCouponInputChange = (value: string) => {
    const normalized = value.toUpperCase();
    setCouponCode(normalized);
    if (normalized.trim() !== (appliedCouponCode ?? '')) {
      setPreview(null);
      setAppliedCouponCode(null);
      setCouponMessage(null);
    }
  };

  const checkoutItems = useMemo(() => {
    if (!cart) return [];
    if (!selectedCartItemIds) return cart.items;
    const set = new Set(selectedCartItemIds);
    return cart.items.filter((item) => set.has(item.cartItemId));
  }, [cart, selectedCartItemIds]);

  const handleSubmitOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cart || checkoutItems.length === 0) {
      setError('Giỏ hàng đang trống, không thể tạo đơn hàng.');
      return;
    }

    if (useSavedAddress) {
      if (!selectedAddressId) {
        setError('Vui lòng chọn địa chỉ giao hàng.');
        return;
      }
    } else if (!recipientName.trim() || !recipientPhone.trim() || !shippingAddress.trim()) {
      setError('Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const createdOrder = await orderApi.createOrder(
        {
          ...addressPayload(),
          paymentMethod,
          // Chỉ gửi mã giảm giá đã bấm "Áp dụng" thành công để tổng tiền hiển thị luôn khớp với tiền server trừ.
          couponCode: appliedCouponCode ?? undefined,
          note: note.trim() || undefined,
          idempotencyKey,
          cartItemIds: selectedCartItemIds ?? undefined,
        },
        idempotencyKey
      );
      await refreshCart();

      if (paymentMethod === 'STORE_CREDIT') {
        toast(`Đã thanh toán đơn ${createdOrder.orderCode} bằng StoreCredit.`);
        navigate(`/orders/${createdOrder.id}`);
        return;
      }

      if (paymentMethod === 'VNPAY') {
        try {
          const payment = await paymentApi.startPayment({ orderId: createdOrder.id, method: 'VNPAY' });
          const session = await paymentApi.createVnpaySession(payment.id);
          toast(`Đã tạo đơn ${createdOrder.orderCode}. Đang chuyển tới cổng thanh toán VNPay...`);
          window.location.assign(session.paymentUrl);
          return;
        } catch (payErr) {
          toast(
            apiErrorMessage(payErr, 'Đơn hàng đã được tạo nhưng chưa mở được cổng VNPay. Bạn có thể thanh toán lại trong chi tiết đơn.'),
            { tone: 'error' }
          );
          navigate(`/orders/${createdOrder.id}`);
          return;
        }
      }

      try {
        await paymentApi.startPayment({ orderId: createdOrder.id, method: 'COD' });
        toast(`Đặt hàng thành công! Mã đơn ${createdOrder.orderCode}.`);
      } catch (payErr) {
        toast(
          apiErrorMessage(
            payErr,
            `Đã tạo đơn ${createdOrder.orderCode}, nhưng chưa đồng bộ trạng thái thanh toán COD.`
          ),
          { tone: 'error' }
        );
      }
      navigate(`/orders/${createdOrder.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại tồn kho, địa chỉ hoặc mã giảm giá.'));
    } finally {
      setSubmitting(false);
    }
  };

  const checkoutSubtotal = checkoutItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const subtotal = preview ? preview.subtotal : checkoutSubtotal;
  const discountAmount = preview ? preview.discountAmount : 0;
  const shippingFee = preview ? preview.shippingFee : 0;
  const totalAmount = preview ? preview.totalAmount : Math.max(0, subtotal - discountAmount + shippingFee);
  const canPayWithStoreCredit = storeCreditBalance !== null && storeCreditBalance >= totalAmount;

  if (loading) {
    return <div className="ls-container section"><Spinner label="Đang tải thông tin thanh toán" /></div>;
  }

  if (!cart || checkoutItems.length === 0) {
    return (
      <div className="ls-container section">
        <EmptyState icon="cart" title="Giỏ hàng đang trống" copy={error ?? 'Thêm sản phẩm vào giỏ trước khi thanh toán.'} action={{ label: 'Khám phá laptop', to: '/products' }} />
      </div>
    );
  }

  return (
    <div className="ls-container section">
      <div className="breadcrumb"><Link to="/cart">Giỏ hàng</Link><span>/</span><span>Thanh toán</span></div>
      <PageHeading eyebrow="Chỉ còn một bước nữa" title="Thanh toán" sub="Kiểm tra địa chỉ, phương thức thanh toán và xác nhận đơn hàng." />

      {error && (
        <div className="notice red" role="alert" style={{ marginBottom: 20 }}>
          <Icon name="alert" /><div>{error}</div>
        </div>
      )}

      <form className="content-columns" onSubmit={(e) => void handleSubmitOrder(e)}>
        <div className="stack">
          <section className="panel">
            <div className="step-title"><span>01</span><h3>Địa chỉ nhận hàng</h3></div>
            <div className="stack" style={{ gap: 12 }}>
              {addresses.map((addr) => (
                <label className="address-option" key={addr.id}>
                  <input
                    type="radio"
                    name="address"
                    checked={useSavedAddress && selectedAddressId === addr.id}
                    onChange={() => { setUseSavedAddress(true); setSelectedAddressId(addr.id); }}
                  />
                  <span>
                    <strong>{addr.recipientName} · {addr.phone}</strong>
                    <span className="small muted" style={{ display: 'block', margin: '6px 0' }}>{formatSavedAddress(addr)}</span>
                    {addr.isDefault && <Badge tone="orange">Mặc định</Badge>}
                  </span>
                </label>
              ))}
              <label className="address-option">
                <input type="radio" name="address" checked={!useSavedAddress} onChange={() => setUseSavedAddress(false)} />
                <span>
                  <strong>{addresses.length ? 'Giao tới địa chỉ khác' : 'Nhập địa chỉ nhận hàng'}</strong>
                  <span className="small muted" style={{ display: 'block', marginTop: 4 }}>Địa chỉ chỉ dùng cho đơn này.</span>
                </span>
              </label>
              {!useSavedAddress && (
                <div className="stack" style={{ gap: 14, paddingTop: 6 }}>
                  <div className="field-row">
                    <label className="field"><span>Họ tên người nhận *</span>
                      <input required maxLength={100} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Nguyễn Văn A" autoComplete="name" />
                    </label>
                    <label className="field"><span>Số điện thoại *</span>
                      <input type="tel" required maxLength={20} value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="0901234567" autoComplete="tel" />
                    </label>
                  </div>
                  <label className="field"><span>Địa chỉ nhận hàng *</span>
                    <input required value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" autoComplete="street-address" />
                  </label>
                </div>
              )}
              <Link to="/me/addresses" className="text-btn small">Quản lý sổ địa chỉ <Icon name="arrow-right" /></Link>
            </div>
          </section>

          <section className="panel">
            <div className="step-title"><span>02</span><h3>Phương thức thanh toán</h3></div>
            <div className="grid2">
              <label className="payment-option">
                <input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} />
                <span><strong>Thanh toán khi nhận hàng</strong><small>COD · Trả tiền mặt cho shipper</small></span>
              </label>
              <label className="payment-option">
                <input type="radio" name="paymentMethod" value="VNPAY" checked={paymentMethod === 'VNPAY'} onChange={() => setPaymentMethod('VNPAY')} />
                <span><strong>VNPay</strong><small>Thanh toán trực tuyến qua cổng VNPay</small></span>
              </label>
              <label className="payment-option">
                <input type="radio" name="paymentMethod" value="STORE_CREDIT" checked={paymentMethod === 'STORE_CREDIT'}
                  disabled={!canPayWithStoreCredit} onChange={() => setPaymentMethod('STORE_CREDIT')} />
                <span>
                  <strong>StoreCredit</strong>
                  <small>
                    {storeCreditBalance === null
                      ? (storeCreditLoading ? 'Đang tải số dư…' : 'Không thể tải số dư.')
                      : `Số dư ${formatMoney(storeCreditBalance)}${canPayWithStoreCredit ? '' : ' · Chưa đủ để thanh toán'}`}
                  </small>
                </span>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="step-title"><span>03</span><h3>Kiểm tra sản phẩm</h3></div>
            {checkoutItems.map((item) => (
                <div className="order-line" key={item.cartItemId}>
                  <ProductImage src={item.thumbnailImage} alt={item.productName} hint={item.productName} />
                  <div style={{ minWidth: 0 }}>
                    <strong>{item.productName}</strong>
                    <p className="small muted">{item.variantName} · SL {item.quantity} × {formatMoney(item.unitPrice)}</p>
                  </div>
                  <strong className="push">{formatMoney(item.lineTotal)}</strong>
                </div>
            ))}
            <label className="field" style={{ marginTop: 16 }}>
              <span>Ghi chú giao hàng (tùy chọn)</span>
              <textarea maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: Giao giờ hành chính" style={{ minHeight: 70 }} />
            </label>
          </section>
        </div>

        <div className="stack order-summary">
          <aside className="panel">
            <h3>Tóm tắt đơn hàng</h3>
            <div className="row" style={{ marginTop: 16 }}>
              <label className="field" style={{ flex: 1 }}>
                <span className="sr-only">Mã giảm giá</span>
                <input value={couponCode} onChange={(e) => handleCouponInputChange(e.target.value)} placeholder="Nhập mã giảm giá" />
              </label>
              <button type="button" className="btn" disabled={previewLoading} onClick={() => void handlePreviewCoupon()}>
                {previewLoading ? 'Đang kiểm tra' : 'Áp dụng'}
              </button>
            </div>
            {couponMessage && <p className="small" style={{ color: 'var(--green)', marginTop: 10 }}>{couponMessage}</p>}
            {couponCode.trim() && !appliedCouponCode && (
              <p className="small muted" style={{ marginTop: 8 }}>Bấm “Áp dụng” để kiểm tra và trừ mã giảm giá trước khi đặt hàng.</p>
            )}
            <div className="summary-line"><span className="muted">Tạm tính</span><strong>{formatMoney(subtotal)}</strong></div>
            <div className="summary-line"><span className="muted">Giảm giá</span><strong style={{ color: 'var(--green)' }}>−{formatMoney(discountAmount)}</strong></div>
            <div className="summary-line"><span className="muted">Vận chuyển</span><strong>{shippingFee ? formatMoney(shippingFee) : 'Miễn phí'}</strong></div>
            <hr className="divider" />
            <div className="summary-line total"><span>Tổng cộng</span><strong>{formatMoney(totalAmount)}</strong></div>
            <p className="small muted">Đã bao gồm thuế VAT.</p>
          </aside>
          <button type="submit" className="btn primary full"
            disabled={submitting || (paymentMethod === 'STORE_CREDIT' && !canPayWithStoreCredit)} style={{ minHeight: 50 }}>
            {submitting ? 'Đang tạo đơn hàng...' : <>Đặt hàng <Icon name="arrow-right" /></>}
          </button>
          <Link to="/cart" className="text-btn small" style={{ justifyContent: 'center' }}><Icon name="arrow-left" /> Quay lại giỏ hàng</Link>
        </div>
      </form>
    </div>
  );
};
