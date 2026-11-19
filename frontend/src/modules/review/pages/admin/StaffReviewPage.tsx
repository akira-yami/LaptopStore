import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataTable, PageHeader, Pagination, SearchInput, SecondaryButton, SelectFilter } from '@/components/common/AdminUI';
import { apiErrorMessage, useToast } from '@/components/ui';
import { reviewApi } from '../../api/reviewApi';
import { Review } from '../../types';
import { formatReviewDate } from '../../utils/reviewFormat';
import { Avatar, StarRating, VisibilityBadge } from '../../components/ReviewUI';

const PAGE_SIZE = 10;

type VisibilityTab = 'ALL' | 'VISIBLE' | 'HIDDEN';

const tabs: { value: VisibilityTab; label: string }[] = [
    { value: 'ALL', label: 'Tất cả đánh giá' },
    { value: 'VISIBLE', label: 'Đang hiển thị' },
    { value: 'HIDDEN', label: 'Đã ẩn' }
];

const ratingOptions = [
    { value: 'ALL', label: 'Tất cả số sao' },
    ...[5, 4, 3, 2, 1].map(r => ({ value: String(r), label: `${r} sao` }))
];

const monthKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth() + 1}`;
};

const StaffReviewPage: React.FC = () => {
    const toast = useToast();
    const [tab, setTab] = useState<VisibilityTab>('ALL');
    const [keyword, setKeyword] = useState('');
    const [rating, setRating] = useState('ALL');
    const [month, setMonth] = useState('ALL');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [page, setPage] = useState(1);

    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const loadReviews = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params: { visible?: boolean; rating?: number; page: number; size: number } = {
                page: 0,
                size: 100
            };
            if (tab === 'VISIBLE') params.visible = true;
            if (tab === 'HIDDEN') params.visible = false;
            if (rating !== 'ALL') params.rating = Number(rating);

            const res = await reviewApi.getStaffReviews(params);
            setReviews(res.content ?? []);
        } catch (err) {
            setError(apiErrorMessage(err, 'Không thể tải danh sách đánh giá.'));
        } finally {
            setLoading(false);
        }
    }, [tab, rating]);

    useEffect(() => {
        void loadReviews();
    }, [loadReviews]);

    const monthOptions = useMemo(() => {
        const keys = Array.from(new Set(reviews.map(r => monthKey(r.createdAt))));
        return [
            { value: 'ALL', label: 'Tất cả thời gian' },
            ...keys.map(k => {
                const [y, m] = k.split('-');
                return { value: k, label: `Tháng ${m}, ${y}` };
            })
        ];
    }, [reviews]);

    const filtered = useMemo(() => {
        const kw = keyword.trim().toLowerCase().replace(/^#/, '');
        return reviews.filter(
            r =>
                (month === 'ALL' || monthKey(r.createdAt) === month) &&
                (!kw ||
                    r.productName.toLowerCase().includes(kw) ||
                    r.variantName.toLowerCase().includes(kw) ||
                    String(r.orderItemId).includes(kw))
        );
    }, [reviews, month, keyword]);

    const selected = filtered.find(r => r.id === selectedId) ?? filtered[0];
    const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
    const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const withReset = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        setPage(1);
    };

    const handleSelect = (id: number) => {
        setSelectedId(id);
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleToggleVisible = async () => {
        if (!selected) return;
        if (selected.visible && !window.confirm('Ẩn đánh giá này? Khách hàng khác sẽ không còn thấy nội dung này.')) return;
        try {
            setUpdating(true);
            await reviewApi.updateVisibility(selected.id, !selected.visible);
            toast(selected.visible ? 'Đã ẩn đánh giá.' : 'Đã hiện lại đánh giá.');
            await loadReviews();
        } catch (err) {
            toast(apiErrorMessage(err, 'Không thể cập nhật trạng thái hiển thị đánh giá.'), { tone: 'error' });
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="min-h-full bg-[#F7F7FA] p-6 md:p-10">
            <PageHeader breadcrumb="Vận hành / Đánh giá" title="Đánh giá của khách hàng" subtitle="Giữ không gian đánh giá hữu ích và đáng tin cậy." />

            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                    {error}
                </div>
            )}

            <div className="flex flex-wrap gap-3 mb-8">
                {tabs.map(t => (
                    <button
                        key={t.value}
                        onClick={() => withReset(setTab)(t.value)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
                            tab === t.value
                                ? 'bg-orange-50 border-orange-50 text-[#C2410C] font-semibold'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <SearchInput value={keyword} onChange={withReset(setKeyword)} placeholder="Tìm sản phẩm hoặc mã dòng hàng" />
                <div className="flex flex-wrap gap-4">
                    <SelectFilter value={rating} onChange={withReset(setRating)} options={ratingOptions} />
                    <SelectFilter value={month} onChange={withReset(setMonth)} options={monthOptions} />
                </div>
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 mb-8 text-center text-gray-500">
                    Đang tải danh sách đánh giá...
                </div>
            ) : selected ? (
                <div ref={cardRef} className="scroll-mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 mb-8">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-5">
                            <Avatar name={selected.productName} />
                            <div>
                                <p className="font-semibold text-gray-900">{selected.productName}</p>
                                <p className="mt-1 text-sm text-gray-500">
                                    Dòng hàng #{selected.orderItemId} · {selected.variantName} · {formatReviewDate(selected.createdAt)}
                                </p>
                            </div>
                        </div>
                        <VisibilityBadge visible={selected.visible} />
                    </div>

                    <StarRating rating={selected.rating} className="mt-6 text-[#C2410C]" />
                    <p className="mt-5 text-gray-800 leading-relaxed">
                        {selected.comment || <span className="italic text-gray-400">Khách hàng không để lại nội dung.</span>}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-100">
                        <p className="text-sm text-gray-500">Đã mua hàng · Biến thể #{selected.variantId}</p>
                        <SecondaryButton disabled={updating} onClick={() => void handleToggleVisible()} className="min-w-[240px]">
                            {updating ? 'Đang cập nhật...' : selected.visible ? 'Ẩn đánh giá' : 'Hiện lại đánh giá'}
                        </SecondaryButton>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 mb-8 text-center text-gray-400">
                    Không có đánh giá nào phù hợp với bộ lọc.
                </div>
            )}

            {!loading && selected && (
                <>
                    <DataTable
                        headers={['Sản phẩm / Dòng hàng', 'Đánh giá', 'Nội dung', 'Ngày gửi', 'Hiển thị']}
                        isEmpty={paged.length === 0}
                        emptyText="Không có đánh giá nào phù hợp với bộ lọc."
                    >
                        {paged.map(r => (
                            <tr
                                key={r.id}
                                onClick={() => handleSelect(r.id)}
                                title="Bấm để xem chi tiết"
                                aria-selected={r.id === selected.id}
                                className={`cursor-pointer transition ${
                                    r.id === selected.id
                                        ? 'bg-orange-50/70 shadow-[inset_3px_0_0_#C2410C]'
                                        : 'hover:bg-orange-50/40'
                                }`}
                            >
                                <td className="px-4 py-5 font-semibold text-gray-900 whitespace-nowrap">
                                    {r.productName}
                                    <br />
                                    <span className="text-xs font-normal text-gray-500">Dòng hàng #{r.orderItemId}</span>
                                </td>
                                <td className="px-4 py-5">
                                    <StarRating rating={r.rating} size="sm" className="text-gray-900" />
                                </td>
                                <td className="px-4 py-5 text-gray-800 max-w-md truncate">{r.comment}</td>
                                <td className="px-4 py-5 text-gray-800 whitespace-nowrap">{formatReviewDate(r.createdAt)}</td>
                                <td className="px-4 py-5">
                                    <VisibilityBadge visible={r.visible} />
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                    {filtered.length > 0 && <Pagination total={filtered.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setPage} />}
                </>
            )}
        </div>
    );
};

export default StaffReviewPage;
