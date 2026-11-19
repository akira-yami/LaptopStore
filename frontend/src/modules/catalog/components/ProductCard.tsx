import { useAuth } from '@/app/providers/AuthProvider';
import { formatMoney, Icon, ProductImage, useToast } from '@/components/ui';
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ProductSummaryResponse } from '../types/catalog';
import { AddToCartDialog } from './AddToCartDialog';

interface Props {
    product: ProductSummaryResponse;
}

const ProductCard: React.FC<Props> = ({ product }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const toast = useToast();
    const [choosing, setChoosing] = useState(false);
    const href = `/products/${product.id}`;
    const configuration = product.availableConfiguration;
    const price = configuration?.price ?? product.startingPrice;
    const specs = [
        ['CPU', product.cpu],
        ['Màn hình', product.screenSize],
        ['RAM', configuration?.ram],
        ['Ổ cứng', configuration?.storage],
    ].filter(([, value]) => value?.trim());

    const chooseConfiguration = () => {
        if (!isAuthenticated) {
            toast('Đăng nhập để thêm sản phẩm vào giỏ hàng.');
            navigate('/login', { state: { from: location } });
            return;
        }
        setChoosing(true);
    };

    return (
        <article className="product-card">
            <Link to={href} className="product-visual" aria-label={`Xem ${product.name}`}>
                <ProductImage src={product.thumbnailImage} alt={product.name} hint={`${product.categoryName} ${product.name}`} />
            </Link>
            <div className="product-card-content">
                <p className="product-meta">{[product.brandName, product.categoryName].filter(Boolean).join(' · ')}</p>
                <h3><Link to={href}>{product.name}</Link></h3>
                {specs.length > 0 ? (
                    <dl className="product-specs">
                        {specs.map(([label, value]) => (
                            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                        ))}
                    </dl>
                ) : (
                    <Link className="text-btn small product-spec-link" to={href}>Xem thông số <Icon name="arrow-right" /></Link>
                )}
                <div className="card-foot">
                    <div className="card-pricing">
                        {price != null
                            ? <div className="price"><small>Giá từ</small>{formatMoney(price)}</div>
                            : <div className="muted small">Liên hệ để báo giá</div>}
                        {configuration !== undefined && (
                            <span className={`card-stock ${configuration ? 'in-stock' : ''}`}>
                                <span className="dot" /> {configuration ? 'Còn hàng' : 'Tạm hết hàng'}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        className="btn primary"
                        aria-haspopup="dialog"
                        disabled={isLoading || configuration === null}
                        onClick={chooseConfiguration}
                    >
                        <Icon name="cart" /> Thêm vào giỏ
                    </button>
                </div>
            </div>
            {choosing && <AddToCartDialog product={product} onDismiss={() => setChoosing(false)} />}
        </article>
    );
};

export const ProductCardSkeleton: React.FC = () => (
    <div className="product-card" aria-hidden="true">
        <div className="product-visual skeleton" />
        <div className="product-card-content product-card-loading">
            <div className="skeleton" style={{ height: 12, width: '45%' }} />
            <div className="skeleton" style={{ height: 20, width: '80%' }} />
            <div className="skeleton" style={{ height: 96 }} />
            <div className="skeleton" style={{ height: 38, width: '55%' }} />
            <div className="skeleton" style={{ height: 44 }} />
        </div>
    </div>
);

export default ProductCard;
