import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '@/components/ui';
import { couponApi } from '../../api/couponApi';
import { Coupon, CouponDisplayStatus, CouponUsage, DiscountType } from '../../types';
import {
    CouponStatusBadge,
    DataTable,
    PageHeader,
    Pagination,
    PrimaryButton,
    SearchInput,
    SelectFilter,
    StatCard
} from '../../components/PromotionUI';
import { formatDateRange, formatDiscount, formatShortMoney, formatVnd, getDisplayStatus } from '../../utils/couponFormat';

const PAGE_SIZE = 10;
const WEEK_MS = 7 * 24 * 3600 * 1000;

type StatusTab = 'ALL' | Extract<CouponDisplayStatus, 'RUNNING' | 'UPCOMING' | 'ENDED'>;

const tabs: { value: StatusTab; label: string }[] = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'RUNNING', label: 'Đang hoạt động' },
    { value: 'UPCOMING', label: 'Sắp bắt đầu' },
    { value: 'ENDED', label: 'Đã kết thúc' }
];

const typeOptions = [
    { value: 'ALL', label: 'Mọi loại giảm giá' },
    { value: 'FIXED', label: 'Số tiền cố định' },
    { value: 'PERCENT', label: 'Phần trăm' }
];

const CouponListPage: React.FC = () => {
    const navigate = useNavigate();
    const [rawCoupons, setRawCoupons] = useState<Coupon[]>([]);
    const [usages, setUsages] = useState<CouponUsage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<StatusTab>('ALL');
    const [keyword, setKeyword] = useState('');
    const [type, setType] = useState<'ALL' | DiscountType>('ALL');
    const [page, setPage] = useState(1);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        Promise.all([
            couponApi.getAllCoupons(),
            couponApi.getAllUsages().catch(() => [] as CouponUsage[])
        ])
            .then(([couponList, usageList]) => {
                if (!cancelled) {
                    setRawCoupons(couponList);
                    setUsages(usageList);
                }
            })
            .catch(err => {
                if (!cancelled) {
                    setError(apiErrorMessage(err, 'Không thể tải danh sách mã giảm giá.'));
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const now = useMemo(() => new Date(), [rawCoupons]);
    const coupons = useMemo(
        () => rawCoupons.map(c => ({ ...c, displayStatus: getDisplayStatus(c, now) })),
        [rawCoupons, now]
    );

    const stats = useMemo(() => {
        const running = coupons.filter(c => c.displayStatus === 'RUNNING');
        const endingThisWeek = running.filter(c => new Date(c.endsAt).getTime() - now.getTime() <= WEEK_MS).length;

        const applied = usages.filter(u => u.status === 'ACTIVE');
        const inMonth = (iso: string, offset: number) => {
            const d = new Date(iso);
            const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1);
            return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
        };
        const thisMonth = applied.filter(u => inMonth(u.createdAt, 0)).length;
        const lastMonth = applied.filter(u => inMonth(u.createdAt, -1)).length;
        const growth = lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

        return {
            runningCount: running.length,
            endingThisWeek,
            thisMonth,
            growthNote:
                growth == null
                    ? 'Chưa có dữ liệu tháng trước'
                    : `${growth >= 0 ? 'Tăng' : 'Giảm'} ${Math.abs(growth)}% so với tháng trước`,
            totalDiscount: applied.reduce((sum, u) => sum + Number(u.discountAmount || 0), 0)
        };
    }, [coupons, usages, now]);

    const filtered = useMemo(() => {
        const kw = keyword.trim().toUpperCase();
        return coupons.filter(
            c =>
                (tab === 'ALL' || c.displayStatus === tab) &&
                (type === 'ALL' || c.discountType === type) &&
                (!kw || c.code.toUpperCase().includes(kw))
        );
    }, [coupons, tab, type, keyword]);

    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const withReset = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        setPage(1);
    };

    return (
        <div className="min-h-full bg-[#F7F7FA] p-6 md:p-10">
            <PageHeader
                breadcrumb="Kinh doanh / Khuyến mãi"
                title="Khuyến mãi"
                subtitle="Ưu đãi đúng thời điểm, tăng niềm vui mua sắm."
                action={<PrimaryButton onClick={() => navigate('/admin/promotions/new')}>Tạo mã giảm giá</PrimaryButton>}
            />

            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                    label="Mã đang hoạt động"
                    value={String(stats.runningCount).padStart(2, '0')}
                    note={`${stats.endingThisWeek} mã kết thúc trong tuần`}
                />
                <StatCard label="Lượt dùng trong tháng" value={String(stats.thisMonth)} note={stats.growthNote} />
                <StatCard label="Tổng tiền ưu đãi" value={formatShortMoney(stats.totalDiscount)} note="Trên các đơn đã áp dụng" />
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
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

            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <SearchInput value={keyword} onChange={withReset(setKeyword)} placeholder="Tìm mã giảm giá" />
                <SelectFilter value={type} onChange={v => withReset(setType)(v as 'ALL' | DiscountType)} options={typeOptions} />
            </div>

            <DataTable
                headers={['Mã giảm giá', 'Giá trị giảm', 'Điều kiện tối thiểu', 'Thời gian áp dụng', 'Trạng thái', 'Thao tác']}
                isEmpty={!loading && paged.length === 0}
                emptyText="Không có mã giảm giá nào phù hợp."
            >
                {loading ? (
                    <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                            Đang tải danh sách mã giảm giá...
                        </td>
                    </tr>
                ) : (
                    paged.map(c => (
                        <tr
                            key={c.id}
                            onDoubleClick={() => navigate(`/admin/promotions/${c.id}/usages`)}
                            title="Nhấp đúp để xem lịch sử sử dụng"
                            className="cursor-pointer select-none hover:bg-orange-50/40 transition"
                        >
                            <td className="px-4 py-6 font-bold text-gray-900">{c.code}</td>
                            <td className="px-4 py-6 text-gray-800">{formatDiscount(c)}</td>
                            <td className="px-4 py-6 text-gray-800">{formatVnd(c.minOrderAmount)}</td>
                            <td className="px-4 py-6 text-gray-800 whitespace-nowrap">{formatDateRange(c.startsAt, c.endsAt)}</td>
                            <td className="px-4 py-6">
                                <CouponStatusBadge status={c.displayStatus} />
                            </td>
                            <td className="px-4 py-6 whitespace-nowrap space-x-3">
                                <button onClick={() => navigate(`/admin/promotions/${c.id}/usages`)} className="text-gray-600 hover:text-gray-900 hover:underline">
                                    Lịch sử
                                </button>
                                {c.displayStatus !== 'ENDED' && (
                                    <button onClick={() => navigate(`/admin/promotions/${c.id}/edit`)} className="text-[#C2410C] hover:underline">
                                        Chỉnh sửa →
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))
                )}
            </DataTable>

            <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
    );
};

export default CouponListPage;
