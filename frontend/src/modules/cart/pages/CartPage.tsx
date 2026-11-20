import { useCart } from '@/app/providers/CartProvider';
import { apiErrorMessage, Badge, EmptyState, formatMoney, Icon, PageHeading, ProductImage, Spinner, useToast } from '@/components/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cartApi } from '../api/cartApi';
import { CartItem } from '../types';

const isItemUnavailable = (item: CartItem) => item.sellable === false || item.availableStock === 0;
const isItemExceedingStock = (item: CartItem) =>
  !isItemUnavailable(item) && item.availableStock != null && item.quantity > item.availableStock;

export const CartPage = () => {
  const { cart, setCart, refresh } = useCart();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const seenIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const items = useMemo(() => cart?.items ?? [], [cart]);

  useEffect(() => {
    if (items.length === 0) {
      seenIdsRef.current.clear();
      setSelectedIds([]);
      return;
    }
    const existingIds = new Set(items.map((i) => i.cartItemId));
    const newlyAddedValidIds = items
      .filter((i) => !seenIdsRef.current.has(i.cartItemId) && !isItemUnavailable(i))
      .map((i) => i.cartItemId);
    items.forEach((i) => seenIdsRef.current.add(i.cartItemId));

    setSelectedIds((prev) => {
      const kept = prev.filter((id) => existingIds.has(id));
      return [...kept, ...newlyAddedValidIds];
    });
  }, [items]);

  const effectiveSelectedIds = selectedIds;

  const selectedSet = useMemo(() => new Set(effectiveSelectedIds), [effectiveSelectedIds]);
  const selectedItems = useMemo(() => items.filter((i) => selectedSet.has(i.cartItemId)), [items, selectedSet]);
  const selectableItems = useMemo(() => items.filter((i) => !isItemUnavailable(i)), [items]);

  const toggleItem = (cartItemId: number) => {
    setSelectedIds((prev) => (
      prev.includes(cartItemId)
        ? prev.filter((id) => id !== cartItemId)
        : [...prev, cartItemId]
    ));
  };

  const toggleAll = () => {
    if (effectiveSelectedIds.length === selectableItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableItems.map((i) => i.cartItemId));
    }
  };

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

  const hasSelectedIssue = selectedItems.some((item) => isItemUnavailable(item) || isItemExceedingStock(item));
  const selectedTotalQty = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedTotalAmount = selectedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const isPartialSelection = selectedItems.length > 0 && selectedItems.length < items.length;
  const checkoutHref = isPartialSelection
    ? `/checkout?items=${selectedItems.map((i) => i.cartItemId).join(',')}`
    : '/checkout';

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
            {selectableItems.length > 1 && (
              <div className="row between" style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--line)' }}>
                <label className="row small" style={{ gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectableItems.length > 0 && effectiveSelectedIds.length === selectableItems.length}
                    onChange={toggleAll}
                  />
                  <span>Chọn tất cả ({effectiveSelectedIds.length}/{selectableItems.length})</span>
                </label>
              </div>
            )}
            {items.map((item) => {
              const href = item.productId ? `/products/${item.productId}` : null;
              const busy = pendingId === item.cartItemId;
              const unavailable = isItemUnavailable(item);
              const exceedsStock = isItemExceedingStock(item);
              const atMaxStock = item.availableStock != null && item.quantity >= item.availableStock;
              const checked = selectedSet.has(item.cartItemId);

              return (
                <article className="cart-item" key={item.cartItemId} style={{ opacity: busy ? 0.6 : 1 }}>
                  <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${item.productName}`}
                      checked={checked}
                      disabled={busy || unavailable}
                      onChange={() => toggleItem(item.cartItemId)}
                    />
                    <ProductImage className="cart-thumb" src={item.thumbnailImage} alt={item.productName} hint={item.productName} />
                  </div>
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
            <div className="summary-line"><span className="muted">Đã chọn</span><strong>{selectedTotalQty} sản phẩm</strong></div>
            <div className="summary-line"><span className="muted">Tạm tính</span><strong>{formatMoney(selectedTotalAmount)}</strong></div>
            <div className="summary-line"><span className="muted">Vận chuyển</span><strong>Miễn phí</strong></div>
            <hr className="divider" />
            <div className="summary-line total"><span>Tạm tính</span><strong>{formatMoney(selectedTotalAmount)}</strong></div>
            <p className="small muted" style={{ marginBottom: 14 }}>Mã giảm giá được áp dụng ở bước thanh toán.</p>
            {selectedItems.length === 0 ? (
              <>
                <div className="notice" role="status" style={{ marginBottom: 14 }}>
                  <Icon name="alert" />
                  <div className="small">Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.</div>
                </div>
                <button type="button" className="btn primary full" disabled>Tiến hành thanh toán</button>
              </>
            ) : hasSelectedIssue ? (
              <>
                <div className="notice red" role="alert" style={{ marginBottom: 14 }}>
                  <Icon name="alert" />
                  <div className="small">Vui lòng xóa hoặc điều chỉnh sản phẩm hết hàng/ngừng bán trước khi thanh toán.</div>
                </div>
                <button type="button" className="btn primary full" disabled>Tiến hành thanh toán</button>
              </>
            ) : (
              <Link to={checkoutHref} className="btn primary full">Tiến hành thanh toán <Icon name="arrow-right" /></Link>
            )}
            <div className="row small muted" style={{ marginTop: 18, fontSize: 11 }}><Icon name="shield" />Thông tin của bạn luôn được bảo vệ</div>
          </aside>
        </div>
      )}
    </div>
  );
};
