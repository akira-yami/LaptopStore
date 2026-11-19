import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage, useToast } from '@/components/ui';
import { couponApi } from '../../api/couponApi';
import { Coupon, CouponUsage, CouponUsageStatus } from '../../types';
import {
    DataTable,
    PageHeader,
    Pagination,
    PrimaryButton,
    SearchInput,
    SecondaryButton,
    SelectFilter,
    StatCard,
    UsageStatusBadge
} from '../../components/PromotionUI';
import { formatDateRange, formatDateTime, formatShortMoney, formatVnd } from '../../utils/couponFormat';

const PAGE_SIZE = 10;
const DAY_MS = 24 * 3600 * 1000;

type DateRange = 'PERIOD' | 'LAST_7_DAYS' | 'TODAY';

const statusOptions = [
    { value: 'ALL', label: 'Tất cả lượt dùng' },
    { value: 'ACTIVE', label: 'Đã áp dụng' },
    { value: 'RELEASED', label: 'Đã hoàn lượt' }
];

const CouponUsageHistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const { id } = useParams<{ id: string }>();
    const couponId = Number(id);

    const [coupon, setCoupon] = useState<Coupon | null>(null);
    const [usages, setUsages] = useState<CouponUsage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [releasingId, setReleasingId] = useState<number | null>(null);

    const [keyword, setKeyword] = useState('');
    const [range, setRange] = useState<DateRange>('PERIOD');
    const [status, setStatus] = useState<'ALL' | CouponUsageStatus>('ALL');
    const [page, setPage] = useState(1);

    const loadData = useCallback(async () => {
        if (!couponId || Number.isNaN(couponId)) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const [loadedCoupon, usageList] = await Promise.all([
                couponApi.getCouponById(couponId),
                couponApi.getUsagesByCoupon(couponId)
            ]);
            setCoupon(loadedCoupon);
            setUsages(usageList);
        } catch (err) {
            setError(apiErrorMessage(err, 'Không thể tải lịch sử sử dụng mã giảm giá.'));
        } finally {
            setLoading(false);
        }
    }, [couponId]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleRelease = async (usage: CouponUsage) => {
        if (!window.confirm(`Hoàn lượt sử dụng mã ${usage.couponCode} cho đơn #${usage.orderId}?`)) return;
        try {
            setReleasingId(usage.id);
            await couponApi.releaseUsage(usage.id);
            toast(`Đã hoàn lượt sử dụng cho đơn #${usage.orderId}.`);
            await loadData();
        } catch (err) {
            toast(apiErrorMessage(err, 'Không thể hoàn lượt sử dụng mã giảm giá.'), { tone: 'error' });
        } finally {
            setReleasingId(null);
        }
    };

    const stats = useMemo(() => {
        const applied = usages.filter(u => u.status === 'ACTIVE');
        const total = applied.reduce((sum, u) => sum + Number(u.discountAmount || 0), 0);
        return {
            used: applied.length,
            total,
            average: applied.length ? total / applied.length : 0,
            customers: new Set(applied.map(u => u.userId)).size
        };
    }, [usages]);

    const filtered = useMemo(() => {
        const kw = keyword.trim().toLowerCase().replace(/^#/, '');
        const now = Date.now();
        const startOfToday = new Date().setHours(0, 0, 0, 0);

        return usages.filter(u => {
            const time = new Date(u.createdAt).getTime();
            const inRange =
                range === 'PERIOD' ||
                (range === 'LAST_7_DAYS' && now - time <= 7 * DAY_MS) ||
                (range === 'TODAY' && time >= startOfToday);
            return (
                inRange &&
                (status === 'ALL' || u.status === status) &&
                (!kw || String(u.orderId).includes(kw) || String(u.userId).includes(kw) || u.couponCode.toLowerCase().includes(kw))
            );
        });
    }, [usages, keyword, range, status]);

    if (loading) {
        return (
            <div className="min-h-full bg-[#F7F7FA] p-6 md:p-10 text-sm text-gray-500">
                Đang tải lịch sử sử dụng...
            </div>
        );
    }

    if (!coupon) {
        return (
            <div className="min-h-full bg-[#F7F7FA] p-6 md:p-10">
                <p className="text-gray-600">{error ?? 'Không tìm thấy mã giảm giá.'}</p>
                <SecondaryButton className="mt-4" onClick={() => navigate('/admin/promotions')}>
                    Quay lại khuyến mãi
                </SecondaryButton>
            </div>
        );
    }

    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const remaining = coupon.usageLimit != null ? Math.max(0, coupon.usageLimit - stats.used) : null;

    const withReset = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        setPage(1);
    };

    return (
        <div className="min-h-full bg-[#F7F7FA] p-6 md:p-10">
            <PageHeader
                breadcrumb="Khuyến mãi / Lịch sử"
                title={`Lượt sử dụng ${coupon.code}`}
                subtitle="Theo dõi từng đơn hàng đã áp dụng ưu đãi."
                action={
                    <PrimaryButton onClick={() => navigate(`/admin/promotions/${coupon.id}/edit`)}>Chỉnh sửa mã giảm giá</PrimaryButton>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                    label="Lượt dùng hiện tại"
                    value={coupon.usageLimit != null ? `${stats.used} / ${coupon.usageLimit}` : String(stats.used)}
                    note={remaining != null ? `Còn ${remaining} lượt có thể sử dụng` : 'Không giới hạn tổng lượt dùng'}
                />
                <StatCard
                    label="Tổng tiền đã giảm"
                    value={formatShortMoney(stats.total)}
                    note={
                        coupon.discountType === 'FIXED'
                            ? `${formatVnd(coupon.discountValue)} / đơn hàng`
                            : `Trung bình ${formatVnd(Math.round(stats.average))} / đơn hàng`
                    }
                />
                <StatCard
                    label="Khách hàng áp dụng"
                    value={String(stats.customers)}
                    note={coupon.usagePerUser ? `Tối đa ${coupon.usagePerUser} lượt / khách hàng` : 'Không giới hạn lượt / khách hàng'}
                />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <SearchInput value={keyword} onChange={withReset(setKeyword)} placeholder="Tìm theo mã đơn hoặc user ID" />
                <div className="flex flex-wrap gap-4">
                    <SelectFilter
                        value={range}
                        onChange={v => withReset(setRange)(v as DateRange)}
                        options={[
                            { value: 'PERIOD', label: formatDateRange(coupon.startsAt, coupon.endsAt) },
                            { value: 'LAST_7_DAYS', label: '7 ngày gần nhất' },
                            { value: 'TODAY', label: 'Hôm nay' }
                        ]}
                    />
                    <SelectFilter
                        value={status}
                        onChange={v => withReset(setStatus)(v as 'ALL' | CouponUsageStatus)}
                        options={statusOptions}
                    />
                </div>
            </div>

            <DataTable
                headers={['Đơn hàng', 'Khách hàng', 'Mức giảm', 'Ngày sử dụng', 'Trạng thái', 'Thao tác']}
                isEmpty={paged.length === 0}
                emptyText="Chưa có lượt sử dụng nào phù hợp."
            >
                {paged.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-6 font-bold text-gray-900 whitespace-nowrap">Đơn #{u.orderId}</td>
                        <td className="px-4 py-6 text-gray-800">User #{u.userId}</td>
                        <td className="px-4 py-6 text-gray-800 whitespace-nowrap">{formatVnd(u.discountAmount)}</td>
                        <td className="px-4 py-6 text-gray-800 whitespace-nowrap">{formatDateTime(u.createdAt)}</td>
                        <td className="px-4 py-6">
                            <UsageStatusBadge status={u.status} />
                        </td>
                        <td className="px-4 py-6 whitespace-nowrap">
                            {u.status === 'ACTIVE' ? (
                                <button
                                    type="button"
                                    disabled={releasingId === u.id}
                                    onClick={() => void handleRelease(u)}
                                    className="text-sm font-medium text-[#C2410C] hover:underline disabled:opacity-50"
                                >
                                    {releasingId === u.id ? 'Đang hoàn...' : 'Hoàn lượt'}
                                </button>
                            ) : (
                                <span className="text-xs text-gray-400">—</span>
                            )}
                        </td>
                    </tr>
                ))}
            </DataTable>

            <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
    );
};

export default CouponUsageHistoryPage;
