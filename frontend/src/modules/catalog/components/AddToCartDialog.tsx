import { useCart } from '@/app/providers/CartProvider';
import { apiErrorMessage, formatMoney, Icon, Spinner, useToast } from '@/components/ui';
import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogApi } from '../api/catalogApi';
import type { ProductSummaryResponse, VariantSnapshot } from '../types/catalog';
import { isSellableVariant } from '../utils/variants';

interface Props {
  product: ProductSummaryResponse;
  onDismiss: () => void;
}

export const AddToCartDialog: React.FC<Props> = ({ product, onDismiss }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { addItem } = useCart();
  const toast = useToast();
  const [variants, setVariants] = useState<VariantSnapshot[] | null>(null);
  const [selectedId, setSelectedId] = useState<number>();
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  useEffect(() => {
    let cancelled = false;
    catalogApi.getProductById(product.id)
      .then((detail) => {
        if (cancelled) return;
        const available = detail.status?.toUpperCase() === 'ACTIVE'
          ? (detail.variants ?? []).filter(isSellableVariant).sort((a, b) => a.price - b.price || a.id - b.id)
          : [];
        setVariants(available);
        setSelectedId(available[0]?.id);
      })
      .catch(() => {
        if (cancelled) return;
        setVariants([]);
        setError('Chưa tải được cấu hình. Hãy đóng hộp thoại và thử lại.');
      });
    return () => { cancelled = true; };
  }, [product.id]);

  const selected = variants?.find((variant) => variant.id === selectedId);
  const dismiss = () => { if (!adding) onDismiss(); };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || adding) return;
    setAdding(true);
    setError('');
    try {
      await addItem(selected.id);
      toast(`Đã thêm ${product.name} vào giỏ hàng.`, { action: { label: 'Xem giỏ', to: '/cart' } });
      onDismiss();
    } catch (err) {
      setError(apiErrorMessage(err, 'Chưa thêm được sản phẩm vào giỏ. Hãy thử lại.'));
      setAdding(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      className="modal quick-cart"
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); dismiss(); }}
      onClick={(event) => { if (event.target === event.currentTarget) dismiss(); }}
    >
      <form onSubmit={submit} className="quick-cart-form">
        <div className="modal-head">
          <h2 id={titleId}>Chọn cấu hình</h2>
          <button type="button" className="icon-btn" aria-label="Đóng hộp thoại" onClick={dismiss} disabled={adding}>
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body quick-cart-body">
          <strong>{product.name}</strong>
          {variants === null && <Spinner label="Đang tải cấu hình" />}
          {selected && (
            <>
              <label className="field">
                <span>RAM, ổ cứng và màu</span>
                <select value={selected.id} disabled={adding} onChange={(event) => setSelectedId(Number(event.target.value))}>
                  {variants?.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {[variant.ram, variant.storage, variant.color].filter(Boolean).join(' · ') || variant.sku}
                    </option>
                  ))}
                </select>
              </label>
              <div className="quick-cart-price"><strong>{formatMoney(selected.price)}</strong><span>Còn {selected.quantity} máy</span></div>
            </>
          )}
          {variants?.length === 0 && !error && <p className="muted">Sản phẩm đang tạm hết cấu hình có thể đặt mua.</p>}
          {error && <p className="notice red" role="alert">{error}</p>}
        </div>
        <div className="modal-actions">
          <Link to={`/products/${product.id}`} className="btn">Xem chi tiết</Link>
          <button type="submit" className="btn primary" disabled={!selected || adding}>
            <Icon name="cart" /> {adding ? 'Đang thêm…' : 'Thêm vào giỏ'}
          </button>
        </div>
      </form>
    </dialog>
  );
};
