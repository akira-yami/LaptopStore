import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { PrimaryButton, SecondaryButton } from '@/components/common/AdminUI';
import { apiErrorMessage, useToast } from '@/components/ui';
import { reviewApi } from '../../api/reviewApi';
import { Review, ReviewableOrderItem } from '../../types';
import { formatReviewDate } from '../../utils/reviewFormat';
import { LaptopIllustration, PurchasedBadge, StarInput } from '../../components/ReviewUI';

const MAX_COMMENT = 2000;

const WriteReviewPage: React.FC = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const location = useLocation();
    const { orderItemId } = useParams<{ orderItemId: string }>();
    const numericOrderItemId = Number(orderItemId);
    const navState = (location.state as Partial<ReviewableOrderItem> | null) ?? null;

    const [existing, setExisting] = useState<Review | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [savedReview, setSavedReview] = useState<Review | null>(null);

    useEffect(() => {
        if (!numericOrderItemId || Number.isNaN(numericOrderItemId)) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);

        reviewApi.getMyReviews(0, 100)
            .then(page => {
                if (cancelled) return;
                const found = (page.content ?? []).find(r => r.orderItemId === numericOrderItemId) ?? null;
                if (found) {
                    setExisting(found);
                    setRating(found.rating);
                    setComment(found.comment ?? '');
                }
            })
            .catch(() => {
                // Nếu chưa có review hoặc lỗi tải lịch sử vẫn cho phép gửi đánh giá mới
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [numericOrderItemId]);

    if (!numericOrderItemId || Number.isNaN(numericOrderItemId)) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold text-gray-900">Không tìm thấy sản phẩm cần đánh giá</h1>
                <p className="mt-2 text-gray-500">Bạn chỉ có thể đánh giá sản phẩm thuộc đơn hàng đã giao thành công.</p>
                <SecondaryButton className="mt-6" onClick={() => navigate('/orders')}>
                    Quay lại đơn hàng
                </SecondaryButton>
            </div>
        );
    }

    const displayProductName = savedReview?.productName ?? existing?.productName ?? navState?.productName ?? `Sản phẩm #${numericOrderItemId}`;
    const displayVariantName = savedReview?.variantName ?? existing?.variantName ?? navState?.variantName ?? `Dòng hàng #${numericOrderItemId}`;
    const displayProductId = savedReview?.productId ?? existing?.productId ?? navState?.productId;
    const displayOrderCode = navState?.orderCode;
    const displayDeliveredAt = navState?.deliveredAt ?? existing?.createdAt;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!rating) {
            setError('Vui lòng chọn số sao trước khi gửi đánh giá.');
            return;
        }

        try {
            setSubmitting(true);
            setError('');
            const trimmed = comment.trim();
            const res = existing
                ? await reviewApi.updateReview(existing.id, { rating, comment: trimmed || undefined })
                : await reviewApi.createReview({ orderItemId: numericOrderItemId, rating, comment: trimmed || undefined });
            setExisting(res);
            setSavedReview(res);
            setSubmitted(true);
            toast(existing ? 'Đã cập nhật đánh giá của bạn.' : 'Đã gửi đánh giá thành công!');
        } catch (err) {
            setError(apiErrorMessage(err, 'Không thể gửi đánh giá. Đảm bảo đơn hàng của bạn đã được giao thành công.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
            <nav className="text-sm text-gray-500">
                <Link to="/products" className="hover:text-[#C2410C]">Cửa hàng</Link>
                <span className="mx-3">/</span>
                <span className="text-gray-900">Đánh giá sản phẩm</span>
            </nav>

            <p className="mt-8 text-xs font-semibold tracking-wide uppercase text-[#C2410C]">Sau mỗi hành trình</p>
            <h1 className="mt-1 text-3xl md:text-4xl font-bold text-gray-900">Chia sẻ trải nghiệm của bạn</h1>
            <p className="mt-2 text-gray-500">Một đánh giá chân thật giúp mọi người chọn laptop dễ dàng hơn.</p>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,9fr)] gap-6 mt-8 items-start">
                <aside className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 text-center">
                    <div className="flex items-center justify-center rounded-2xl bg-gray-50 p-8">
                        <LaptopIllustration />
                    </div>
                    <div className="mt-5">
                        <PurchasedBadge />
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">{displayProductName}</h2>
                    <p className="mt-3 text-sm text-gray-500">{displayVariantName}</p>
                    <hr className="my-6 border-gray-100" />
                    <p className="font-semibold text-gray-900">
                        {displayOrderCode ? `Đơn hàng #${displayOrderCode}` : `Mã dòng hàng #${numericOrderItemId}`}
                    </p>
                    {displayDeliveredAt && (
                        <p className="mt-3 text-sm text-gray-500">Đã giao thành công · {formatReviewDate(displayDeliveredAt)}</p>
                    )}
                </aside>

                {loading ? (
                    <section className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
                        Đang tải thông tin đánh giá...
                    </section>
                ) : submitted ? (
                    <section className="bg-white rounded-2xl border border-gray-200 p-6 md:p-10 text-center">
                        <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2 className="mt-5 text-2xl font-bold text-gray-900">Cảm ơn bạn đã chia sẻ!</h2>
                        <p className="mt-2 text-gray-500">Đánh giá của bạn đã được ghi nhận và hiển thị cho những người mua sau.</p>
                        <div className="flex flex-wrap justify-center gap-4 mt-8">
                            <SecondaryButton onClick={() => navigate('/orders')}>Quay lại đơn hàng</SecondaryButton>
                            {displayProductId && (
                                <PrimaryButton onClick={() => navigate(`/products/${displayProductId}/reviews`)}>Xem đánh giá sản phẩm</PrimaryButton>
                            )}
                        </div>
                    </section>
                ) : (
                    <form onSubmit={e => void handleSubmit(e)} noValidate className="bg-white rounded-2xl border border-gray-200 p-6 md:p-10">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Bạn thấy chiếc laptop này thế nào?</h2>

                        <p className="mt-6 mb-5 text-sm font-semibold text-gray-900">Mức độ hài lòng của bạn</p>
                        <StarInput
                            value={rating}
                            onChange={v => {
                                setRating(v);
                                setError('');
                            }}
                        />
                        {error && <p className="mt-2 text-sm text-red-500" role="alert">{error}</p>}

                        <label className="block mt-6 rounded-2xl border border-gray-200 p-5 focus-within:border-[#C2410C] focus-within:ring-2 focus-within:ring-orange-100 transition">
                            <span className="block text-sm font-semibold text-gray-900">Chia sẻ cảm nhận</span>
                            <textarea
                                value={comment}
                                onChange={e => setComment(e.target.value.slice(0, MAX_COMMENT))}
                                rows={5}
                                placeholder="Hiệu năng, màn hình, pin, dịch vụ giao hàng... bạn thấy thế nào?"
                                className="mt-3 w-full resize-none text-gray-800 placeholder:text-gray-400 focus:outline-none leading-relaxed"
                            />
                            <span className={`block text-xs ${comment.length >= MAX_COMMENT ? 'text-red-500' : 'text-gray-500'}`}>
                                {new Intl.NumberFormat('vi-VN').format(comment.length)} / {new Intl.NumberFormat('vi-VN').format(MAX_COMMENT)} ký tự
                            </span>
                        </label>

                        <div className="flex gap-4 mt-6 p-5 rounded-2xl bg-orange-50">
                            <svg className="w-5 h-5 mt-0.5 shrink-0 text-[#C2410C]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div>
                                <p className="font-semibold text-[#C2410C]">Đánh giá gắn với sản phẩm bạn đã mua</p>
                                <p className="mt-1 text-sm text-gray-600">Bạn có thể chỉnh sửa nội dung đánh giá của mình sau khi gửi.</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-between gap-4 mt-6">
                            <SecondaryButton type="button" className="min-w-[200px]" onClick={() => navigate('/orders')}>
                                Quay lại đơn hàng
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={submitting} className="min-w-[200px]">
                                {submitting ? 'Đang gửi...' : existing ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
                            </PrimaryButton>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default WriteReviewPage;
