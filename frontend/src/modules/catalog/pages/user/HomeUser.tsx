import { EmptyState, Icon, IconName } from '@/components/ui';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../api/catalogApi';
import ProductCard, { ProductCardSkeleton } from '../../components/ProductCard';
import { Category, ProductSummaryResponse } from '../../types/catalog';

const TRUST: [IconName, string][] = [
    ['shield', 'Chính hãng 100%'],
    ['truck', 'Giao hàng toàn quốc'],
    ['wallet', 'Thanh toán linh hoạt'],
    ['headset', 'Tư vấn tận tâm'],
];

const categoryLink = (name: string) => `/products?categoryName=${encodeURIComponent(name)}`;

export const HomeUser: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [products, setProducts] = useState<ProductSummaryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        catalogApi.getCategories()
            .then((list) => setCategories(list.filter((c) => c.active !== false)))
            .catch(() => setCategories([]));
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        catalogApi.searchProducts({ page: 0, size: 8, categoryName: activeCategory || undefined })
            .then((page) => {
                if (cancelled) return;
                setProducts(page.content);
            })
            .catch(() => !cancelled && setError(true))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [activeCategory]);

    const chips = [{ name: '', label: 'Tất cả' }, ...categories.slice(0, 5).map((c) => ({ name: c.name, label: c.name }))];

    return (
        <div className="ls-container home-page">
            <section className="hero">
                <div className="hero-copy">
                    <h1>Mở máy,<br /><em>mở điều mới.</em></h1>
                    <p>Tìm chiếc laptop hợp với cách bạn học, làm việc và sáng tạo.</p>
                    <div className="row">
                        <Link to="/products" className="btn primary">Khám phá laptop <Icon name="arrow-right" /></Link>
                        <Link to="/ai-assistant" className="btn hero-secondary"><Icon name="sparkles" /> Tư vấn AI</Link>
                    </div>
                </div>
                <div className="hero-art">
                    <img src="/images/laptopstore-intro.webp" alt="" width={2172} height={724} fetchPriority="high" />
                </div>
            </section>

            <ul className="trust-row">
                {TRUST.map(([icon, title]) => (
                    <li className="trust-item" key={title}>
                        <Icon name={icon} />
                        {title}
                    </li>
                ))}
            </ul>

            <section className="section home-catalog" aria-labelledby="home-catalog-title">
                <div className="section-head">
                    <h2 id="home-catalog-title">Laptop theo nhu cầu</h2>
                    <Link to={activeCategory ? categoryLink(activeCategory) : '/products'} className="text-btn">
                        Xem tất cả <Icon name="arrow-right" />
                    </Link>
                </div>
                <div className="chips" role="group" aria-label="Lọc theo nhu cầu">
                    {chips.map((c) => (
                        <button
                            key={c.label}
                            type="button"
                            aria-pressed={activeCategory === c.name}
                            className={`chip ${activeCategory === c.name ? 'active' : ''}`}
                            onClick={() => setActiveCategory(c.name)}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="products-grid">
                        {Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}
                    </div>
                ) : error ? (
                    <EmptyState icon="alert" title="Chưa tải được sản phẩm" copy="Không kết nối được máy chủ. Hãy kiểm tra backend đang chạy rồi tải lại trang." />
                ) : products.length === 0 ? (
                    <EmptyState icon="search" title="Chưa có sản phẩm trong nhóm này" copy="Thử chọn nhu cầu khác hoặc xem toàn bộ laptop." action={{ label: 'Xem tất cả laptop', to: '/products' }} />
                ) : (
                    <div className="products-grid">
                        {products.map((p) => <ProductCard key={p.id} product={p} />)}
                    </div>
                )}
            </section>

            <section className="section home-collections" aria-labelledby="collection-title">
                <h2 id="collection-title">Khám phá bộ sưu tập</h2>
                <div className="collection-grid">
                    <Link to={categoryLink('Mỏng nhẹ')} className="collection collection-thin">
                        <div className="collection-copy">
                            <h3>Laptop mỏng nhẹ</h3>
                            <p>Gọn nhẹ để mang theo khi đi học, đi làm hay di chuyển.</p>
                            <span className="collection-cta">Khám phá <Icon name="arrow-right" /></span>
                        </div>
                        <img src="/images/collection-thin.webp" alt="" width={800} height={600} loading="lazy" />
                    </Link>
                    <Link to={categoryLink('Gaming')} className="collection collection-gaming">
                        <div className="collection-copy">
                            <h3>Laptop gaming</h3>
                            <p>Đồ họa mạnh và màn hình mượt cho những tựa game yêu thích.</p>
                            <span className="collection-cta">Khám phá <Icon name="arrow-right" /></span>
                        </div>
                        <img src="/images/collection-gaming.webp" alt="" width={800} height={600} loading="lazy" />
                    </Link>
                </div>
            </section>

            <section className="ai-banner" aria-labelledby="ai-banner-title">
                <div className="ai-symbol"><Icon name="sparkles" /></div>
                <div>
                    <h2 id="ai-banner-title">Tìm laptop cùng AI</h2>
                    <p>Cho AI biết nhu cầu và ngân sách để nhận gợi ý cấu hình phù hợp.</p>
                </div>
                <Link to="/ai-assistant" className="btn primary push">Bắt đầu tư vấn <Icon name="arrow-right" /></Link>
            </section>
        </div>
    );
};

export default HomeUser;
