import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage, useToast } from '@/components/ui';
import { couponApi } from '../../api/couponApi';
import { Coupon, DiscountType } from '../../types';
import { PageHeader, PrimaryButton, SecondaryButton } from '../../components/PromotionUI';
import {
    formatMoneyInput,
    formatShortMoney,
    formatVnd,
    fromDateTimeLocal,
    parseMoneyInput,
    toDateTimeLocal
} from '../../utils/couponFormat';

interface FormState {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderAmount: number;
    maxDiscount: number;
    active: boolean;
    usageLimit: string;
    usagePerUser: string;
    startsAt: string; // datetime-local
    endsAt: string;   // datetime-local
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const CODE_PATTERN = /^[A-Za-z0-9_-]{3,30}$/;

const inputClass = (error?: string) =>
    `w-full px-4 py-3.5 rounded-xl border bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${
        error ? 'border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-[#C2410C] focus:ring-orange-100'
    }`;

const Field: React.FC<{ label: string; required?: boolean; error?: string; children: React.ReactNode }> = ({
    label,
    required,
    error,
    children
}) => (
    <label className="block">
        <span className="block mb-2.5 text-sm font-semibold text-gray-900">
            {label}
            {required && ' *'}
        </span>
        {children}
        {error && <span className="block mt-1.5 text-xs text-red-500">{error}</span>}
    </label>
);

const INITIAL_FORM: FormState = {
    code: '',
    discountType: 'FIXED',
    discountValue: 0,
    minOrderAmount: 0,
    maxDiscount: 0,
    active: true,
    usageLimit: '',
    usagePerUser: '1',
    startsAt: '',
    endsAt: ''
};

const CouponFormPage: React.FC = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const { id } = useParams<{ id: string }>();
    const couponId = id ? Number(id) : null;
    const isEdit = Boolean(couponId);

    const [coupon, setCoupon] = useState<Coupon | null>(null);
    const [usedCount, setUsedCount] = useState(0);
    const [loading, setLoading] = useState(isEdit);
    const [notFound, setNotFound] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [errors, setErrors] = useState<FormErrors>({});

    useEffect(() => {
        if (!couponId) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setNotFound(false);

        Promise.all([
            couponApi.getCouponById(couponId),
            couponApi.getUsagesByCoupon(couponId).catch(() => [])
        ])
            .then(([loaded, usageList]) => {
                if (cancelled) return;
                setCoupon(loaded);
                setUsedCount(usageList.filter(u => u.status === 'ACTIVE').length);
                setForm({
                    code: loaded.code,
                    discountType: loaded.discountType,
                    discountValue: Number(loaded.discountValue) || 0,
                    minOrderAmount: Number(loaded.minOrderAmount) || 0,
                    maxDiscount: Number(loaded.maxDiscount) || 0,
                    active: loaded.active,
                    usageLimit: loaded.usageLimit != null ? String(loaded.usageLimit) : '',
                    usagePerUser: loaded.usagePerUser != null ? String(loaded.usagePerUser) : '',
                    startsAt: toDateTimeLocal(loaded.startsAt),
                    endsAt: toDateTimeLocal(loaded.endsAt)
                });
            })
            .catch(() => {
                if (!cancelled) setNotFound(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [couponId]);

    const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setErrors(prev => ({ ...prev, [key]: undefined }));
    };

    const isFixed = form.discountType === 'FIXED';
    const effectiveMax = isFixed ? form.discountValue : form.maxDiscount;

    const preview = useMemo(() => {
        const title = isFixed
            ? `Khách nhận ưu đãi ${formatVnd(form.discountValue)}`
            : `Khách nhận ưu đãi ${form.discountValue || 0}%${form.maxDiscount ? `, tối đa ${formatVnd(form.maxDiscount)}` : ''}`;

        const parts = [
            form.minOrderAmount ? `Áp dụng cho đơn từ ${formatVnd(form.minOrderAmount)}` : 'Áp dụng cho mọi đơn hàng',
            [
                form.usagePerUser ? `mỗi khách dùng ${form.usagePerUser} lần` : 'không giới hạn lượt mỗi khách',
                form.usageLimit ? `tối đa ${form.usageLimit} lượt` : 'không giới hạn tổng lượt'
            ].join(', ')
        ];
        return { title, detail: `${parts.join('; ')}.` };
    }, [form, isFixed]);

    const subtitle = form.minOrderAmount
        ? `Giảm ${isFixed ? 'trực tiếp' : `${form.discountValue || 0}%`} cho đơn hàng từ ${formatShortMoney(form.minOrderAmount)} đồng.`
        : 'Điền thông tin để thiết lập mã giảm giá.';

    const validate = (): FormErrors => {
        const e: FormErrors = {};
        if (!CODE_PATTERN.test(form.code)) e.code = 'Mã gồm 3–30 ký tự chữ, số, "_" hoặc "-".';

        if (form.discountValue <= 0) e.discountValue = 'Giá trị giảm phải lớn hơn 0.';
        else if (!isFixed && form.discountValue > 100) e.discountValue = 'Phần trăm giảm tối đa là 100.';

        if (form.usageLimit && Number(form.usageLimit) <= 0) e.usageLimit = 'Phải là số dương.';
        if (form.usagePerUser && Number(form.usagePerUser) <= 0) e.usagePerUser = 'Phải là số dương.';
        if (form.usageLimit && form.usagePerUser && Number(form.usagePerUser) > Number(form.usageLimit)) {
            e.usagePerUser = 'Không được vượt tổng lượt dùng tối đa.';
        }

        if (!form.startsAt) e.startsAt = 'Chọn thời điểm bắt đầu.';
        if (!form.endsAt) e.endsAt = 'Chọn thời điểm kết thúc.';
        else if (form.startsAt && form.endsAt <= form.startsAt) e.endsAt = 'Phải sau thời điểm bắt đầu.';
        return e;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const e = validate();
        setErrors(e);
        if (Object.keys(e).length > 0) return;

        const payload = {
            code: form.code.trim().toUpperCase(),
            discountType: form.discountType,
            discountValue: form.discountValue,
            maxDiscount: effectiveMax > 0 ? effectiveMax : null,
            minOrderAmount: form.minOrderAmount > 0 ? form.minOrderAmount : null,
            usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
            usagePerUser: form.usagePerUser ? Number(form.usagePerUser) : null,
            startsAt: fromDateTimeLocal(form.startsAt),
            endsAt: fromDateTimeLocal(form.endsAt)
        };

        try {
            setSaving(true);
            setSubmitError(null);
            if (isEdit && couponId) {
                const updated = await couponApi.updateCoupon(couponId, payload);
                if (updated.active !== form.active) {
                    await couponApi.setActive(couponId, form.active);
                }
                toast(`Đã cập nhật mã giảm giá ${updated.code}.`);
            } else {
                const created = await couponApi.createCoupon(payload);
                if (!form.active) {
                    await couponApi.setActive(created.id, false);
                }
                toast(`Đã tạo mã giảm giá ${created.code}.`);
            }
            navigate('/admin/promotions');
        } catch (err) {
            setSubmitError(apiErrorMessage(err, 'Không thể lưu mã giảm giá. Vui lòng kiểm tra lại dữ liệu.'));
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async () => {
        if (!coupon) return;
        const next = !coupon.active;
        if (!next && !window.confirm(`Tạm ngưng mã ${coupon.code}? Khách hàng sẽ không thể áp dụng mã này.`)) return;
        try {
            setToggling(true);
            const updated = await couponApi.setActive(coupon.id, next);
            setCoupon(updated);
            update('active', updated.active);
            toast(updated.active ? `Đã kích hoạt lại mã ${updated.code}.` : `Đã tạm ngưng mã ${updated.code}.`);
        } catch (err) {
            setSubmitError(apiErrorMessage(err, 'Không thể đổi trạng thái mã giảm giá.'));
        } finally {
            setToggling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-full bg-[#F7F7FA] p-6 md:p-10 text-sm text-gray-500">
                Đang tải thông tin mã giảm giá...
            </div>
        );
    }

    if (isEdit && (notFound || !coupon)) {
        return (
            <div className="min-h-full bg-[#F7F7FA] p-6 md:p-10">
                <p className="text-gray-600">Không tìm thấy mã giảm giá.</p>
                <SecondaryButton className="mt-4" onClick={() => navigate('/admin/promotions')}>
                    Quay lại khuyến mãi
                </SecondaryButton>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-[#F7F7FA] p-6 md:p-10">
            <PageHeader
                breadcrumb={`Khuyến mãi / ${isEdit ? coupon!.code : 'Tạo mới'}`}
                title="Thiết lập mã giảm giá"
                subtitle="Điều kiện rõ ràng giúp khách dễ dùng, cửa hàng dễ quản lý."
            />

            {submitError && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                    {submitError}
                </div>
            )}

            <form onSubmit={e => void handleSubmit(e)} noValidate className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-900">{isEdit ? `Mã ${coupon!.code}` : 'Mã giảm giá mới'}</h2>
                <p className="mt-2 mb-6 text-sm text-gray-500">{subtitle}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    <Field label="Mã giảm giá" required error={errors.code}>
                        <input
                            value={form.code}
                            onChange={e => update('code', e.target.value.toUpperCase())}
                            placeholder="VD: LAPTOP500"
                            maxLength={30}
                            className={inputClass(errors.code)}
                        />
                    </Field>
                    <Field label="Loại giảm giá" required>
                        <select
                            value={form.discountType}
                            onChange={e => {
                                update('discountType', e.target.value as DiscountType);
                                update('discountValue', 0);
                            }}
                            className={inputClass()}
                        >
                            <option value="FIXED">Số tiền cố định (VND)</option>
                            <option value="PERCENT">Phần trăm (%)</option>
                        </select>
                    </Field>
                    <Field label="Giá trị giảm" required error={errors.discountValue}>
                        <div className="relative">
                            <input
                                inputMode="numeric"
                                value={isFixed ? formatMoneyInput(form.discountValue) : form.discountValue || ''}
                                onChange={e => update('discountValue', parseMoneyInput(e.target.value))}
                                placeholder={isFixed ? '500.000' : '10'}
                                className={`${inputClass(errors.discountValue)} pr-10`}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">{isFixed ? 'đ' : '%'}</span>
                        </div>
                    </Field>

                    <Field label="Đơn hàng tối thiểu">
                        <div className="relative">
                            <input
                                inputMode="numeric"
                                value={formatMoneyInput(form.minOrderAmount)}
                                onChange={e => update('minOrderAmount', parseMoneyInput(e.target.value))}
                                placeholder="0"
                                className={`${inputClass()} pr-10`}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">đ</span>
                        </div>
                    </Field>
                    <Field label="Giảm tối đa">
                        <div className="relative">
                            <input
                                inputMode="numeric"
                                value={formatMoneyInput(effectiveMax)}
                                onChange={e => update('maxDiscount', parseMoneyInput(e.target.value))}
                                disabled={isFixed}
                                placeholder="Không giới hạn"
                                title={isFixed ? 'Với số tiền cố định, mức giảm tối đa bằng giá trị giảm' : undefined}
                                className={`${inputClass()} pr-10`}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">đ</span>
                        </div>
                    </Field>
                    <Field label="Trạng thái">
                        <select
                            value={form.active ? 'true' : 'false'}
                            onChange={e => update('active', e.target.value === 'true')}
                            className={inputClass()}
                        >
                            <option value="true">Đang hoạt động</option>
                            <option value="false">Tạm ngưng</option>
                        </select>
                    </Field>
                </div>

                <hr className="my-7 border-gray-100" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    <Field label="Tổng lượt dùng tối đa" error={errors.usageLimit}>
                        <input
                            type="number"
                            min={1}
                            value={form.usageLimit}
                            onChange={e => update('usageLimit', e.target.value)}
                            placeholder="Không giới hạn"
                            className={inputClass(errors.usageLimit)}
                        />
                    </Field>
                    <Field label="Lượt dùng / khách hàng" error={errors.usagePerUser}>
                        <input
                            type="number"
                            min={1}
                            value={form.usagePerUser}
                            onChange={e => update('usagePerUser', e.target.value)}
                            placeholder="Không giới hạn"
                            className={inputClass(errors.usagePerUser)}
                        />
                    </Field>
                    <Field label="Đã sử dụng">
                        <input value={`${usedCount} lượt`} disabled className={inputClass()} />
                    </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-6">
                    <Field label="Thời điểm bắt đầu" required error={errors.startsAt}>
                        <input
                            type="datetime-local"
                            value={form.startsAt}
                            onChange={e => update('startsAt', e.target.value)}
                            className={inputClass(errors.startsAt)}
                        />
                    </Field>
                    <Field label="Thời điểm kết thúc" required error={errors.endsAt}>
                        <input
                            type="datetime-local"
                            value={form.endsAt}
                            onChange={e => update('endsAt', e.target.value)}
                            min={form.startsAt || undefined}
                            className={inputClass(errors.endsAt)}
                        />
                    </Field>
                </div>

                <div className="flex gap-4 mt-7 p-5 rounded-2xl bg-orange-50">
                    <svg className="w-6 h-6 mt-0.5 shrink-0 text-blue-700" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9.5" />
                        <path d="M12 11v6M12 7.5v.01" strokeLinecap="round" />
                    </svg>
                    <div>
                        <p className="font-semibold text-[#C2410C]">{preview.title}</p>
                        <p className="mt-1 text-sm text-gray-600">{preview.detail}</p>
                    </div>
                </div>

                <div className="flex flex-wrap justify-end gap-4 mt-6">
                    <SecondaryButton type="button" onClick={() => navigate('/admin/promotions')}>
                        Quay lại khuyến mãi
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={saving} className="px-16">
                        {saving ? 'Đang lưu...' : 'Lưu mã giảm giá'}
                    </PrimaryButton>
                </div>
            </form>

            {isEdit && coupon && (
                <div className="flex flex-wrap items-center justify-end gap-4 mt-6">
                    <SecondaryButton className="min-w-[170px] border-transparent" onClick={() => navigate(`/admin/promotions/${coupon.id}/usages`)}>
                        Lịch sử sử dụng
                    </SecondaryButton>
                    <SecondaryButton className="min-w-[170px]" disabled={toggling} onClick={() => void handleToggleActive()}>
                        {coupon.active ? 'Tạm ngưng mã' : 'Kích hoạt lại mã'}
                    </SecondaryButton>
                </div>
            )}
        </div>
    );
};

export default CouponFormPage;
