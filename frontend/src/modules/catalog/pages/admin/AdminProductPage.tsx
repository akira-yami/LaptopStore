import {
    apiErrorMessage,
    Badge,
    formatMoney,
    Icon,
    Modal,
    PageHeading,
    ProductImage,
    Spinner,
    useToast,
} from '@/components/ui';
import { apiClient } from '@/services/api/apiClient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../api/catalogApi';
import { Brand, Category, ProductImageDto, ProductResponse, VariantSnapshot } from '../../types/catalog';

type ProductForm = {
    name: string;
    description: string;
    brandId: string;
    categoryId: string;
    sku: string;
    ram: string;
    storage: string;
    color: string;
    price: string;
};

const EMPTY: ProductForm = {
    name: '',
    description: '',
    brandId: '',
    categoryId: '',
    sku: '',
    ram: '16GB',
    storage: '512GB SSD',
    color: 'Bạc',
    price: '',
};

type VariantForm = {
    sku: string;
    variantName: string;
    ram: string;
    storage: string;
    color: string;
    price: string;
    status: string;
};

const EMPTY_VARIANT_FORM: VariantForm = {
    sku: '',
    variantName: '',
    ram: '16GB',
    storage: '512GB SSD',
    color: 'Bạc',
    price: '',
    status: 'ACTIVE',
};

const adminProductApi = {
    list: async () => (await apiClient.get<ProductResponse[]>('/admin/products')).data,
    create: async (body: object) => (await apiClient.post<{ id: number }>('/admin/products', body)).data,
    update: async (id: number, body: object) => (await apiClient.put<ProductResponse>(`/admin/products/${id}`, body)).data,
    setStatus: async (id: number, status: string) =>
        (await apiClient.patch<string>(`/admin/products/${id}/status`, null, { params: { status } })).data,
    addVariant: async (productId: number, body: object) =>
        (await apiClient.post(`/admin/products/${productId}/variants`, body)).data,
    getVariants: async (productId: number) =>
        (await apiClient.get<VariantSnapshot[]>(`/admin/products/${productId}/variants`)).data,
    updateVariant: async (productId: number, variantId: number, body: object) =>
        (await apiClient.put<VariantSnapshot>(`/admin/products/${productId}/variants/${variantId}`, body)).data,
    setVariantStatus: async (productId: number, variantId: number, active: boolean) =>
        (await apiClient.patch<string>(`/admin/products/${productId}/variants/${variantId}/status`, null, {
            params: { active },
        })).data,
    updateImages: async (productId: number, images: ProductImageDto[]) =>
        (await apiClient.put<ProductImageDto[]>(`/admin/products/${productId}/images`, images)).data,
};

const priceRange = (p: ProductResponse) => {
    const prices = (p.variants ?? []).map((v) => v.price).filter((x) => x != null);
    if (!prices.length) return '—';
    const min = Math.min(...prices),
        max = Math.max(...prices);
    return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
};

export const AdminProductPage: React.FC = () => {
    const toast = useToast();
    const [products, setProducts] = useState<ProductResponse[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [keyword, setKeyword] = useState('');

    // Product Modal state
    const [editing, setEditing] = useState<ProductResponse | 'new' | null>(null);
    const [form, setForm] = useState<ProductForm>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState<ProductResponse | null>(null);

    // Variant Management Modal state
    const [variantModalProduct, setVariantModalProduct] = useState<ProductResponse | null>(null);
    const [productVariants, setProductVariants] = useState<VariantSnapshot[]>([]);
    const [variantLoading, setVariantLoading] = useState(false);
    const [editingVariant, setEditingVariant] = useState<VariantSnapshot | 'new' | null>(null);
    const [variantForm, setVariantForm] = useState<VariantForm>(EMPTY_VARIANT_FORM);
    const [savingVariant, setSavingVariant] = useState(false);

    // Image Management Modal state
    const [imageModalProduct, setImageModalProduct] = useState<ProductResponse | null>(null);
    const [imageList, setImageList] = useState<ProductImageDto[]>([]);
    const [newImageUrl, setNewImageUrl] = useState('');
    const [savingImages, setSavingImages] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setProducts(await adminProductApi.list());
        } catch (err) {
            setError(apiErrorMessage(err, 'Không tải được danh sách sản phẩm.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
        catalogApi.getBrands().then(setBrands).catch(() => setBrands([]));
        catalogApi.getCategories().then(setCategories).catch(() => setCategories([]));
    }, [load]);

    const visible = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        return products.filter(
            (p) =>
                !q ||
                p.name.toLowerCase().includes(q) ||
                (p.variants ?? []).some((v) => v.sku.toLowerCase().includes(q))
        );
    }, [products, keyword]);

    // Product Form
    const openForm = (p: ProductResponse | 'new') => {
        if (p === 'new') {
            setForm({
                ...EMPTY,
                brandId: brands[0] ? String(brands[0].id) : '',
                categoryId: categories[0] ? String(categories[0].id) : '',
            });
        } else {
            setForm({
                ...EMPTY,
                name: p.name,
                description: p.description ?? '',
                brandId: String(brands.find((b) => b.name === p.brandName)?.id ?? ''),
                categoryId: String(categories.find((c) => c.name === p.categoryName)?.id ?? ''),
            });
        }
        setEditing(p);
    };

    const set = (k: keyof ProductForm) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => setForm((f) => ({ ...f, [k]: k === 'sku' ? e.target.value.toUpperCase() : e.target.value }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.brandId || !form.categoryId) {
            toast('Nhập tên, chọn thương hiệu và danh mục.', { tone: 'error' });
            return;
        }
        try {
            setSaving(true);
            if (editing === 'new') {
                const price = Number(form.price);
                if (!/^[A-Z0-9-]+$/.test(form.sku) || !(price >= 1)) {
                    toast('SKU chỉ gồm chữ in hoa, số, dấu “-”; giá phải lớn hơn 0.', { tone: 'error' });
                    return;
                }
                const created = await adminProductApi.create({
                    name: form.name.trim(),
                    description: form.description.trim() || form.name.trim(),
                    sku: form.sku,
                    price,
                    brandId: Number(form.brandId),
                    categoryId: Number(form.categoryId),
                });
                if (created?.id) {
                    await adminProductApi.addVariant(created.id, {
                        productId: created.id,
                        sku: form.sku,
                        variantName: `${form.ram} - ${form.storage}`,
                        price,
                        status: 'ACTIVE',
                        color: form.color.trim() || 'Bạc',
                        ram: form.ram.trim(),
                        storage: form.storage.trim(),
                    });
                }
                toast('Đã thêm sản phẩm. Nhập hàng để có tồn kho bán.');
            } else if (editing) {
                const minPrice = Math.min(...(editing.variants ?? []).map((v) => v.price), Number.MAX_SAFE_INTEGER);
                await adminProductApi.update(editing.id, {
                    id: editing.id,
                    name: form.name.trim(),
                    description: form.description.trim(),
                    price: Number.isFinite(minPrice) && minPrice < Number.MAX_SAFE_INTEGER ? minPrice : 1,
                    isActive: editing.status === 'ACTIVE',
                    brandId: Number(form.brandId),
                    categoryId: Number(form.categoryId),
                });
                toast('Đã cập nhật sản phẩm.');
            }
            setEditing(null);
            await load();
        } catch (err) {
            toast(apiErrorMessage(err, 'Không lưu được sản phẩm.'), { tone: 'error' });
            await load();
        } finally {
            setSaving(false);
        }
    };

    const confirmToggle = async () => {
        if (!toggling) return;
        const next = toggling.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        try {
            await adminProductApi.setStatus(toggling.id, next);
            toast(next === 'ACTIVE' ? `Đã mở bán ${toggling.name}.` : `Đã ngừng bán ${toggling.name}.`);
            setToggling(null);
            await load();
        } catch (err) {
            toast(apiErrorMessage(err, 'Không đổi được trạng thái.'), { tone: 'error' });
        }
    };

    // ==========================================
    // Variant Management Handlers
    // ==========================================
    const openVariantModal = async (product: ProductResponse) => {
        setVariantModalProduct(product);
        setEditingVariant(null);
        setVariantLoading(true);
        try {
            const variants = await adminProductApi.getVariants(product.id);
            setProductVariants(variants);
        } catch (err) {
            toast(apiErrorMessage(err, 'Không tải được danh sách biến thể.'), { tone: 'error' });
            setProductVariants(product.variants ?? []);
        } finally {
            setVariantLoading(false);
        }
    };

    const openVariantEdit = (variant: VariantSnapshot | 'new') => {
        if (variant === 'new') {
            setVariantForm(EMPTY_VARIANT_FORM);
        } else {
            setVariantForm({
                sku: variant.sku,
                variantName: `${variant.ram} - ${variant.storage}`,
                ram: variant.ram,
                storage: variant.storage,
                color: variant.color,
                price: String(variant.price),
                status: variant.status,
            });
        }
        setEditingVariant(variant);
    };

    const submitVariant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!variantModalProduct) return;
        const price = Number(variantForm.price);
        if (!/^[A-Z0-9-]+$/.test(variantForm.sku) || !(price >= 1)) {
            toast('SKU chỉ gồm chữ in hoa, số, dấu “-”; giá phải lớn hơn 0.', { tone: 'error' });
            return;
        }

        setSavingVariant(true);
        try {
            if (editingVariant === 'new') {
                await adminProductApi.addVariant(variantModalProduct.id, {
                    productId: variantModalProduct.id,
                    sku: variantForm.sku,
                    variantName: `${variantForm.ram} - ${variantForm.storage}`,
                    price,
                    status: variantForm.status,
                    color: variantForm.color.trim() || 'Bạc',
                    ram: variantForm.ram.trim(),
                    storage: variantForm.storage.trim(),
                });
                toast('Đã thêm biến thể mới.');
            } else if (editingVariant) {
                await adminProductApi.updateVariant(variantModalProduct.id, editingVariant.id, {
                    sku: variantForm.sku,
                    variantName: variantForm.variantName || `${variantForm.ram} - ${variantForm.storage}`,
                    price,
                    status: variantForm.status,
                    color: variantForm.color.trim(),
                    ram: variantForm.ram.trim(),
                    storage: variantForm.storage.trim(),
                });
                toast('Đã cập nhật biến thể.');
            }
            setEditingVariant(null);
            const updated = await adminProductApi.getVariants(variantModalProduct.id);
            setProductVariants(updated);
            await load();
        } catch (err) {
            toast(apiErrorMessage(err, 'Lưu biến thể thất bại.'), { tone: 'error' });
        } finally {
            setSavingVariant(false);
        }
    };

    const toggleVariantActive = async (variant: VariantSnapshot) => {
        if (!variantModalProduct) return;
        const nextActive = variant.active === false ? true : false;
        try {
            await adminProductApi.setVariantStatus(variantModalProduct.id, variant.id, nextActive);
            toast(nextActive ? `Đã mở bán biến thể ${variant.sku}.` : `Đã ngừng bán biến thể ${variant.sku}.`);
            const updated = await adminProductApi.getVariants(variantModalProduct.id);
            setProductVariants(updated);
            await load();
        } catch (err) {
            toast(apiErrorMessage(err, 'Cập nhật trạng thái biến thể thất bại.'), { tone: 'error' });
        }
    };

    // ==========================================
    // Image Management Handlers
    // ==========================================
    const openImageModal = (product: ProductResponse) => {
        setImageModalProduct(product);
        setImageList(product.images ? [...product.images] : []);
        setNewImageUrl('');
    };

    const addImage = () => {
        const url = newImageUrl.trim();
        if (!url) {
            toast('Vui lòng nhập đường dẫn hoặc URL ảnh.', { tone: 'error' });
            return;
        }
        const isPrimary = imageList.length === 0;
        const newImg: ProductImageDto = {
            id: Date.now(),
            imageUrl: url,
            isPrimary,
        };
        setImageList((prev) => [...prev, newImg]);
        setNewImageUrl('');
    };

    const removeImage = (index: number) => {
        setImageList((prev) => {
            const next = prev.filter((_, i) => i !== index);
            if (next.length > 0 && !next.some((img) => img.isPrimary)) {
                next[0].isPrimary = true;
            }
            return next;
        });
    };

    const setPrimaryImage = (index: number) => {
        setImageList((prev) =>
            prev.map((img, i) => ({
                ...img,
                isPrimary: i === index,
            }))
        );
    };

    const saveImages = async () => {
        if (!imageModalProduct) return;
        setSavingImages(true);
        try {
            const saved = await adminProductApi.updateImages(imageModalProduct.id, imageList);
            toast('Đã cập nhật danh sách ảnh sản phẩm.');
            setImageList(saved);
            setImageModalProduct(null);
            await load();
        } catch (err) {
            toast(apiErrorMessage(err, 'Lưu ảnh sản phẩm thất bại.'), { tone: 'error' });
        } finally {
            setSavingImages(false);
        }
    };

    return (
        <>
            <PageHeading
                eyebrow="Quản trị / Sản phẩm"
                title="Danh mục sản phẩm"
                sub="Quản lý thông tin, cấu hình, biến thể và hình ảnh sản phẩm."
                actions={
                    <button type="button" className="btn sm primary" onClick={() => openForm('new')}>
                        <Icon name="plus" /> Thêm sản phẩm
                    </button>
                }
            />
            <div className="ops-toolbar">
                <label className="search">
                    <Icon name="search" />
                    <input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Tìm tên sản phẩm hoặc SKU..."
                        aria-label="Tìm sản phẩm"
                    />
                </label>
                <span className="small muted push">{visible.length} sản phẩm</span>
            </div>

            {loading ? (
                <Spinner />
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>Thương hiệu / Danh mục</th>
                                <th>Biến thể</th>
                                <th>Hình ảnh</th>
                                <th>Giá bán</th>
                                <th>Tồn kho</th>
                                <th>Trạng thái</th>
                                <th style={{ textAlign: 'right' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {error ? (
                                <tr>
                                    <td colSpan={8} className="table-empty">
                                        {error}
                                    </td>
                                </tr>
                            ) : visible.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="table-empty">
                                        Chưa có sản phẩm phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                visible.map((p) => {
                                    const img =
                                        (p.images ?? []).find((i) => i.isPrimary)?.imageUrl ??
                                        p.images?.[0]?.imageUrl;
                                    const stock = (p.variants ?? []).reduce((s, v) => s + (v.quantity || 0), 0);
                                    const imgCount = (p.images ?? []).length;
                                    return (
                                        <tr key={p.id}>
                                            <td>
                                                <div className="row" style={{ gap: 12 }}>
                                                    <ProductImage
                                                        className="thumb-cell"
                                                        src={img}
                                                        alt={p.name}
                                                        hint={`${p.categoryName} ${p.name}`}
                                                    />
                                                    <div>
                                                        <Link to={`/products/${p.id}`} className="primary-cell">
                                                            {p.name}
                                                        </Link>
                                                        <div className="subcell">ID {p.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div>{p.brandName}</div>
                                                <div className="subcell">{p.categoryName}</div>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn sm soft"
                                                    onClick={() => void openVariantModal(p)}
                                                    title="Xem và chỉnh sửa biến thể"
                                                >
                                                    <Icon name="tag" /> {(p.variants ?? []).length} biến thể
                                                </button>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn sm soft"
                                                    onClick={() => openImageModal(p)}
                                                    title="Chỉnh sửa bộ ảnh sản phẩm"
                                                >
                                                    <Icon name="grid" /> {imgCount} ảnh
                                                </button>
                                            </td>
                                            <td>{priceRange(p)}</td>
                                            <td className="primary-cell">{stock}</td>
                                            <td>
                                                {p.status === 'ACTIVE' ? (
                                                    <Badge tone="green">Đang bán</Badge>
                                                ) : (
                                                    <Badge tone="red">Ngừng bán</Badge>
                                                )}
                                            </td>
                                            <td>
                                                <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                                                    <button
                                                        type="button"
                                                        className="btn sm"
                                                        onClick={() => openForm(p)}
                                                    >
                                                        <Icon name="edit" /> Sửa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`btn sm ${
                                                            p.status === 'ACTIVE' ? 'danger' : 'soft'
                                                        }`}
                                                        onClick={() => setToggling(p)}
                                                    >
                                                        {p.status === 'ACTIVE' ? 'Ngừng bán' : 'Mở bán'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Sửa/Thêm Sản Phẩm */}
            <Modal
                open={!!editing}
                wide
                title={editing === 'new' ? 'Thêm sản phẩm' : 'Sửa sản phẩm'}
                onClose={() => setEditing(null)}
                actions={
                    <>
                        <button type="button" className="btn" onClick={() => setEditing(null)}>
                            Hủy
                        </button>
                        <button
                            type="submit"
                            form="product-form"
                            className="btn primary"
                            disabled={saving}
                        >
                            {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
                        </button>
                    </>
                }
            >
                <form id="product-form" className="stack" onSubmit={submit}>
                    <label className="field">
                        <span>Tên sản phẩm *</span>
                        <input required value={form.name} onChange={set('name')} />
                    </label>
                    <div className="field-row">
                        <label className="field">
                            <span>Thương hiệu *</span>
                            <select required value={form.brandId} onChange={set('brandId')}>
                                <option value="">— Chọn —</option>
                                {brands.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="field">
                            <span>Danh mục *</span>
                            <select required value={form.categoryId} onChange={set('categoryId')}>
                                <option value="">— Chọn —</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label className="field">
                        <span>Mô tả</span>
                        <textarea
                            value={form.description}
                            onChange={set('description')}
                            style={{ minHeight: 80 }}
                        />
                    </label>
                    {editing === 'new' && (
                        <>
                            <h3 style={{ marginTop: 6 }}>Cấu hình đầu tiên</h3>
                            <div className="field-row">
                                <label className="field">
                                    <span>SKU *</span>
                                    <input
                                        required
                                        value={form.sku}
                                        onChange={set('sku')}
                                        placeholder="ASU-ZEN14-16-512"
                                    />
                                </label>
                                <label className="field">
                                    <span>Giá bán (₫) *</span>
                                    <input
                                        type="number"
                                        min={1}
                                        step={1000}
                                        required
                                        value={form.price}
                                        onChange={set('price')}
                                    />
                                </label>
                            </div>
                            <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                                <label className="field">
                                    <span>RAM</span>
                                    <input required value={form.ram} onChange={set('ram')} />
                                </label>
                                <label className="field">
                                    <span>Ổ cứng</span>
                                    <input required value={form.storage} onChange={set('storage')} />
                                </label>
                                <label className="field">
                                    <span>Màu</span>
                                    <input required value={form.color} onChange={set('color')} />
                                </label>
                            </div>
                            <p className="small muted">
                                Tồn kho ban đầu là 0; tăng tồn bằng phiếu nhập ở mục Nhận hàng.
                            </p>
                        </>
                    )}
                </form>
            </Modal>

            {/* Modal Đổi Trạng Thái Bán Sản Phẩm */}
            <Modal
                open={!!toggling}
                title={toggling?.status === 'ACTIVE' ? 'Ngừng bán sản phẩm?' : 'Mở bán sản phẩm?'}
                onClose={() => setToggling(null)}
                actions={
                    <>
                        <button type="button" className="btn" onClick={() => setToggling(null)}>
                            Hủy
                        </button>
                        <button type="button" className="btn primary" onClick={() => void confirmToggle()}>
                            Xác nhận
                        </button>
                    </>
                }
            >
                <p className="muted">
                    {toggling?.name} sẽ{' '}
                    {toggling?.status === 'ACTIVE'
                        ? 'không thể thêm vào giỏ hàng'
                        : 'được bán trở lại'}.
                </p>
            </Modal>

            {/* Modal Quản Lý Biến Thể */}
            <Modal
                open={!!variantModalProduct}
                wide
                title={`Biến thể: ${variantModalProduct?.name ?? ''}`}
                onClose={() => {
                    setVariantModalProduct(null);
                    setEditingVariant(null);
                }}
                actions={
                    <>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => {
                                setVariantModalProduct(null);
                                setEditingVariant(null);
                            }}
                        >
                            Đóng
                        </button>
                        {!editingVariant && (
                            <button
                                type="button"
                                className="btn primary"
                                onClick={() => openVariantEdit('new')}
                            >
                                <Icon name="plus" /> Thêm biến thể
                            </button>
                        )}
                    </>
                }
            >
                {editingVariant ? (
                    <form className="stack" onSubmit={submitVariant}>
                        <h4>{editingVariant === 'new' ? 'Thêm biến thể mới' : `Chỉnh sửa biến thể ${editingVariant.sku}`}</h4>
                        <div className="field-row">
                            <label className="field">
                                <span>Mã SKU *</span>
                                <input
                                    required
                                    value={variantForm.sku}
                                    onChange={(e) =>
                                        setVariantForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))
                                    }
                                    placeholder="SKU-XXX"
                                />
                            </label>
                            <label className="field">
                                <span>Giá bán (₫) *</span>
                                <input
                                    type="number"
                                    min={1}
                                    step={1000}
                                    required
                                    value={variantForm.price}
                                    onChange={(e) =>
                                        setVariantForm((f) => ({ ...f, price: e.target.value }))
                                    }
                                />
                            </label>
                        </div>
                        <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <label className="field">
                                <span>RAM *</span>
                                <input
                                    required
                                    value={variantForm.ram}
                                    onChange={(e) =>
                                        setVariantForm((f) => ({ ...f, ram: e.target.value }))
                                    }
                                />
                            </label>
                            <label className="field">
                                <span>Ổ cứng *</span>
                                <input
                                    required
                                    value={variantForm.storage}
                                    onChange={(e) =>
                                        setVariantForm((f) => ({ ...f, storage: e.target.value }))
                                    }
                                />
                            </label>
                            <label className="field">
                                <span>Màu sắc *</span>
                                <input
                                    required
                                    value={variantForm.color}
                                    onChange={(e) =>
                                        setVariantForm((f) => ({ ...f, color: e.target.value }))
                                    }
                                />
                            </label>
                        </div>
                        <div className="field-row">
                            <label className="field">
                                <span>Trạng thái</span>
                                <select
                                    value={variantForm.status}
                                    onChange={(e) =>
                                        setVariantForm((f) => ({ ...f, status: e.target.value }))
                                    }
                                >
                                    <option value="ACTIVE">ACTIVE (Kinh doanh)</option>
                                    <option value="INACTIVE">INACTIVE (Tạm ngưng)</option>
                                </select>
                            </label>
                        </div>
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setEditingVariant(null)}
                                disabled={savingVariant}
                            >
                                Hủy sửa
                            </button>
                            <button
                                type="submit"
                                className="btn primary"
                                disabled={savingVariant}
                            >
                                {savingVariant ? 'Đang lưu...' : 'Lưu biến thể'}
                            </button>
                        </div>
                    </form>
                ) : variantLoading ? (
                    <Spinner />
                ) : (
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>SKU</th>
                                    <th>Cấu hình</th>
                                    <th>Màu</th>
                                    <th>Giá</th>
                                    <th>Tồn kho</th>
                                    <th>Trạng thái bán</th>
                                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productVariants.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="table-empty">
                                            Chưa có biến thể nào.
                                        </td>
                                    </tr>
                                ) : (
                                    productVariants.map((v) => {
                                        const isVariantActive = v.active !== false;
                                        return (
                                            <tr key={v.id}>
                                                <td className="primary-cell">{v.sku}</td>
                                                <td>{v.ram} - {v.storage}</td>
                                                <td>{v.color}</td>
                                                <td>{formatMoney(v.price)}</td>
                                                <td>{v.quantity ?? 0}</td>
                                                <td>
                                                    {isVariantActive ? (
                                                        <Badge tone="green">Đang bán</Badge>
                                                    ) : (
                                                        <Badge tone="red">Ngừng bán</Badge>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                                                        <button
                                                            type="button"
                                                            className="btn sm"
                                                            onClick={() => openVariantEdit(v)}
                                                        >
                                                            <Icon name="edit" /> Sửa
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`btn sm ${isVariantActive ? 'danger' : 'soft'}`}
                                                            onClick={() => void toggleVariantActive(v)}
                                                        >
                                                            {isVariantActive ? 'Ngừng bán' : 'Mở bán'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>

            {/* Modal Quản Lý Bộ Ảnh Sản Phẩm */}
            <Modal
                open={!!imageModalProduct}
                wide
                title={`Bộ sưu tập ảnh: ${imageModalProduct?.name ?? ''}`}
                onClose={() => setImageModalProduct(null)}
                actions={
                    <>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setImageModalProduct(null)}
                            disabled={savingImages}
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            className="btn primary"
                            onClick={() => void saveImages()}
                            disabled={savingImages}
                        >
                            {savingImages ? 'Đang lưu ảnh...' : 'Lưu bộ ảnh'}
                        </button>
                    </>
                }
            >
                <div className="stack">
                    <p className="muted">
                        Mỗi sản phẩm có thể có nhiều ảnh. Bạn có thể thêm đường dẫn ảnh (hoặc URL), chọn ảnh chính đại diện hoặc xóa ảnh cũ.
                    </p>

                    <div className="row" style={{ gap: 8 }}>
                        <input
                            type="text"
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            placeholder="Ví dụ: /uploads/products/macbook-pro-1.jpg hoặc https://..."
                            style={{ flex: 1 }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addImage();
                                }
                            }}
                        />
                        <button type="button" className="btn primary" onClick={addImage}>
                            <Icon name="plus" /> Thêm ảnh
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginTop: 12 }}>
                        {imageList.length === 0 ? (
                            <p className="table-empty" style={{ gridColumn: '1 / -1' }}>
                                Sản phẩm chưa có ảnh nào. Hãy nhập đường dẫn ảnh phía trên.
                            </p>
                        ) : (
                            imageList.map((img, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        border: img.isPrimary ? '2px solid var(--ls-accent, #3b82f6)' : '1px solid var(--ls-border, #e5e7eb)',
                                        borderRadius: 8,
                                        padding: 8,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8,
                                        position: 'relative',
                                        background: 'var(--ls-card, #fff)',
                                    }}
                                >
                                    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        <ProductImage
                                            src={img.imageUrl}
                                            alt={`Ảnh ${idx + 1}`}
                                            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                                        />
                                    </div>
                                    <div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {img.imageUrl}
                                    </div>
                                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                        {img.isPrimary ? (
                                            <Badge tone="green">Ảnh chính</Badge>
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn sm soft"
                                                onClick={() => setPrimaryImage(idx)}
                                            >
                                                Đặt làm chính
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="btn sm danger"
                                            onClick={() => removeImage(idx)}
                                            title="Xóa ảnh"
                                        >
                                            <Icon name="trash" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default AdminProductPage;
