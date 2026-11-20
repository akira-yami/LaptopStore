import { useCart } from '@/app/providers/CartProvider';
import { apiErrorMessage, Badge, EmptyState, formatMoney, Icon, PageHeading, ProductImage, Spinner, useToast } from '@/components/ui';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cartApi } from '../api/cartApi';

export const CartPage = () => {
  const { cart, setCart, refresh } = useCart();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const updateQuantity = async (cartItemId: number, quantity: number) => {
    if (quantity < 1) return;
    try {
      setPendingId(cartItemId);
      setCart(await cartApi.updateItem(cartItemId, quantity));
    } catch (err) {
      toast(apiErrorMessage(err, 'Không thể cập nhật số lượng. Có thể đã vượt tồn kho.'), { tone: 'error' });
    } finally {
      setPendingId(null);
    }
  };

  const removeItem = async (cartItemId: number, name: string) => {
    try {
      setPendingId(cartItemId);
      await cartApi.removeItem(cartItemId);
      await refresh();
      toast(`Đã xóa ${name} khỏi giỏ.`);
    } catch (err) {
      toast(apiErrorMessage(err, 'Không thể xóa sản phẩm khỏi giỏ.'), { tone: 'error' });
    } finally {
      setPendingId(null);
    }
  };

  if (loading && !cart) return <div className="ls-container section"><Spinner label="Đang tải giỏ hàng" /></div>;

  const items = cart?.items ?? [];
  const hasBlockingIssue = items.some((item) => {
    const unavailable = item.sellable === false || item.availableStock === 0;
    const exceedsStock = item.availableStock != null && item.quantity > item.availableStock;
    return unavailable || exceedsStock;
  });

  return (
    <div className="ls-container section">
      <PageHeading
        eyebrow="Mua sắm của bạn"
        title="Giỏ hàng"
        sub="Một chiếc máy tuyệt vời đang chờ bạn."
        actions={<Link to="/products" className="btn">Tiếp tục mua sắm</Link>}
      />

      {items.length === 0 ? (
        <EmptyState
          icon="cart"
          title="Giỏ hàng đang chờ điều mới"
          copy="Khám phá những chiếc laptop phù hợp và thêm lựa chọn yêu thích vào giỏ."
          action={{ label: 'Khám phá laptop', to: '/products' }}
        />
      ) : (
        <div className="content-columns">
          <div className="panel">
            {items.map((item) => {
              const href = item.productId ? `/products/${item.productId}` : null;
              const busy = pendingId === item.cartItemId;
              const unavailable = item.sellable === false || item.availableStock === 0;
              const exceedsStock = !unavailable && item.availableStock != null && item.quantity > item.availableStock;
              const atMaxStock = item.availableStock != null && item.quantity >= item.availableStock;

              return (
                <article className="cart-item" key={item.cartItemId} style={{ opacity: busy ? 0.6 : 1 }}>
                  <ProductImage className="cart-thumb" src={item.thumbnailImage} alt={item.productName} hint={item.productName} />
                  <div>
                    <h3>{href ? <Link to={href}>{item.productName}</Link> : item.productName}</h3>
                    {item.variantName && <p className="muted small">{item.variantName}</p>}
                    <p className="small muted" style={{ margin: '4px 0 10px' }}>
                      {item.sku ? `SKU ${item.sku} · ` : ''}Đơn giá {formatMoney(item.unitPrice)}
                      {item.availableStock != null && !unavailable && ` · Còn ${item.availableStock}`}
                    </p>
                    {unavailable && (
                      <div style={{ marginBottom: 8 }}>
                        <Badge tone="red">Ngừng bán / Hết hàng</Badge>
                      </div>
                    )}
                    {exceedsStock && (
                      <div style={{ marginBottom: 8 }}>
                        <Badge tone="orange">Vượt tồn kho (chỉ còn {item.availableStock})</Badge>
                      </div>
                    )}
                    <strong style={{ fontSize: 16 }}>{formatMoney(item.lineTotal)}</strong>
                  </div>
                  <div className="item-controls">
                    <div className="quantity">
                      <button type="button" aria-label="Giảm số lượng" disabled={busy || unavailable || item.quantity <= 1} onClick={() => void updateQuantity(item.cartItemId, item.quantity - 1)}>−</button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button type="button" aria-label="Tăng số lượng" disabled={busy || unavailable || atMaxStock} onClick={() => void updateQuantity(item.cartItemId, item.quantity + 1)}>+</button>
                    </div>
                    <button type="button" className="text-btn small" style={{ color: 'var(--muted)' }} disabled={busy} onClick={() => void removeItem(item.cartItemId, item.productName)}>
                      <Icon name="trash" /> Xóa
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="panel order-summary">
            <h3>Tóm tắt đơn hàng</h3>
            <div className="summary-line"><span className="muted">Số lượng</span><strong>{cart?.totalItems ?? 0} sản phẩm</strong></div>
            <div className="summary-line"><span className="muted">Tạm tính</span><strong>{formatMoney(cart?.totalAmount)}</strong></div>
            <div className="summary-line"><span className="muted">Vận chuyển</span><strong>Miễn phí</strong></div>
            <hr className="divider" />
            <div className="summary-line total"><span>Tạm tính</span><strong>{formatMoney(cart?.totalAmount)}</strong></div>
            <p className="small muted" style={{ marginBottom: 14 }}>Mã giảm giá được áp dụng ở bước thanh toán.</p>
            {hasBlockingIssue ? (
              <>
                <div className="notice red" role="alert" style={{ marginBottom: 14 }}>
                  <Icon name="alert" />
                  <div className="small">Vui lòng xóa hoặc điều chỉnh sản phẩm hết hàng/ngừng bán trước khi thanh toán.</div>
                </div>
                <button type="button" className="btn primary full" disabled>Tiến hành thanh toán</button>
              </>
            ) : (
              <Link to="/checkout" className="btn primary full">Tiến hành thanh toán <Icon name="arrow-right" /></Link>
            )}
            <div className="row small muted" style={{ marginTop: 18, fontSize: 11 }}><Icon name="shield" />Thông tin của bạn luôn được bảo vệ</div>
          </aside>
        </div>
      )}
    </div>
  );
};
