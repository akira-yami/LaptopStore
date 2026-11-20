import { apiErrorMessage, Badge, EmptyState, formatDateTime, formatMoney, Icon, Spinner, useToast } from '@/components/ui';
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '../api/userApi';
import { AccountLayout } from '../components/AccountLayout';
import { AvailableCoupon, LoyaltyOverview, LoyaltyRewardTier } from '../types';

const formatCouponDiscount = (coupon: AvailableCoupon) => {
  if (coupon.discountType === 'PERCENT') {
    const maxPart = coupon.maxDiscount ? ` (tối đa ${formatMoney(coupon.maxDiscount)})` : '';
    return `Giảm ${coupon.discountValue}%${maxPart}`;
  }
  return `Giảm ${formatMoney(coupon.discountValue)}`;
};

export const LoyaltyPage: React.FC = () => {
  const toast = useToast();
  const [overview, setOverview] = useState<LoyaltyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeemingTier, setRedeemingTier] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userApi.getLoyaltyOverview();
      setOverview(data);
    } catch (err) {
      toast(apiErrorMessage(err, 'Không thể tải thông tin Loyalty & Coupon.'), { tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleRedeem = async (tier: LoyaltyRewardTier) => {
    if (!overview || overview.pointsBalance < tier.pointsCost) {
      toast('Số dư điểm Loyalty chưa đủ để đổi gói này.', { tone: 'error' });
      return;
    }
    try {
      setRedeemingTier(tier.tierCode);
      const res = await userApi.redeemLoyaltyCoupon(tier.tierCode);
      toast(res.message || `Đã đổi mã ${res.coupon.code} thành công!`);
      await loadOverview();
    } catch (err) {
      toast(apiErrorMessage(err, 'Không thể đổi điểm sang Coupon. Vui lòng thử lại.'), { tone: 'error' });
    } finally {
      setRedeemingTier(null);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
      toast(`Đã sao chép mã ${code}`);
    } catch {
      toast(`Mã coupon của bạn: ${code}`);
    }
  };

  const pointsBalance = overview?.pointsBalance ?? 0;
  const totalEarned = overview?.totalEarned ?? 0;
  const totalRedeemed = overview?.totalRedeemed ?? 0;
  const vndPerPoint = overview?.vndPerPoint ?? 100000;
  const rewardTiers = overview?.rewardTiers ?? [];
  const availableCoupons = overview?.availableCoupons ?? [];
  const transactions = overview?.transactions ?? [];

  return (
    <AccountLayout
      title="Điểm thưởng Loyalty & Coupon"
      sub="Tích điểm khi mua hàng thành công, đổi điểm sang Coupon ưu đãi và quản lý danh sách mã giảm giá có thể dùng."
    >
      {loading && !overview ? (
        <div className="panel"><Spinner /></div>
      ) : (
        <div className="stack">
          {/* Tổng quan điểm Loyalty */}
          <div className="panel stack">
            <div className="row wrap">
              <div>
                <div className="eyebrow">Số dư khả dụng</div>
                <h2 style={{ margin: '4px 0' }}>{pointsBalance} điểm</h2>
                <small className="muted">
                  Tích lũy tự động: Mỗi {formatMoney(vndPerPoint)} giá trị đơn hàng giao thành công = +1 điểm Loyalty.
                </small>
              </div>
              <div className="row wrap push gap12">
                <div className="card-flat" style={{ padding: '10px 14px' }}>
                  <small className="muted">Tổng điểm đã tích</small>
                  <div><strong>+{totalEarned} điểm</strong></div>
                </div>
                <div className="card-flat" style={{ padding: '10px 14px' }}>
                  <small className="muted">Tổng điểm đã đổi</small>
                  <div><strong>{totalRedeemed} điểm</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* Đổi điểm Loyalty sang Coupon */}
          <div className="panel stack">
            <div className="row wrap">
              <div>
                <h3>Đổi điểm Loyalty sang Coupon</h3>
                <small className="muted">
                  Coupon sau khi đổi thuộc riêng tài khoản của bạn, có hiệu lực 30 ngày và áp dụng trực tiếp khi thanh toán.
                </small>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {rewardTiers.map((tier) => {
                const canRedeem = pointsBalance >= tier.pointsCost;
                const isRedeeming = redeemingTier === tier.tierCode;
                return (
                  <div key={tier.tierCode} className="card-flat stack" style={{ justifyContent: 'space-between' }}>
                    <div className="stack" style={{ gap: 6 }}>
                      <div className="row wrap">
                        <Badge tone="orange">{tier.pointsCost} điểm</Badge>
                        <small className="muted push">Hạn {tier.validDays} ngày</small>
                      </div>
                      <strong>{tier.title}</strong>
                      <small className="muted">{tier.description}</small>
                    </div>
                    <button
                      type="button"
                      data-testid={`redeem-tier-${tier.tierCode}`}
                      className={`btn sm ${canRedeem ? 'primary' : ''}`}
                      disabled={!canRedeem || isRedeeming}
                      onClick={() => void handleRedeem(tier)}
                    >
                      {isRedeeming
                        ? 'Đang đổi...'
                        : canRedeem
                          ? `Đổi ${tier.pointsCost} điểm`
                          : 'Chưa đủ điểm'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Danh sách Coupon có thể dùng */}
          <div className="panel stack">
            <div className="row wrap">
              <div>
                <h3>Coupon có thể dùng ({availableCoupons.length})</h3>
                <small className="muted">
                  Bao gồm cả voucher bạn đã đổi từ điểm Loyalty và các mã khuyến mãi công khai đang còn lượt sử dụng.
                </small>
              </div>
              <Link to="/cart" className="btn sm push">
                <Icon name="cart" /> Đến giỏ hàng
              </Link>
            </div>

            {availableCoupons.length === 0 ? (
              <EmptyState
                icon="tag"
                title="Chưa có coupon khả dụng."
                copy="Hãy tích điểm Loyalty khi mua hàng để đổi sang voucher hoặc quay lại săn mã khuyến mãi mới."
              />
            ) : (
              <div className="stack">
                {availableCoupons.map((coupon) => (
                  <div key={coupon.id} className="card-flat row wrap" style={{ gap: 12 }}>
                    <div className="stack" style={{ gap: 4 }}>
                      <div className="row wrap gap8">
                        <strong className="mono">{coupon.code}</strong>
                        <Badge tone={coupon.personal ? 'green' : 'blue'}>
                          {coupon.personal ? 'Đổi từ Loyalty' : 'Mã công khai'}
                        </Badge>
                        {coupon.remainingUserUses != null && (
                          <Badge tone="neutral">Còn {coupon.remainingUserUses} lượt</Badge>
                        )}
                      </div>
                      <div><strong>{formatCouponDiscount(coupon)}</strong></div>
                      <small className="muted">
                        Đơn tối thiểu: {coupon.minOrderAmount ? formatMoney(coupon.minOrderAmount) : '0 ₫'}
                        {coupon.endsAt ? ` · HSD: ${formatDateTime(coupon.endsAt)}` : ''}
                      </small>
                    </div>
                    <div className="row wrap push gap8">
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => void handleCopyCode(coupon.code)}
                      >
                        Sao chép mã
                      </button>
                      <Link to="/cart" className="btn sm primary">
                        Dùng ngay
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lịch sử điểm Loyalty */}
          <div className="panel stack">
            <div>
              <h3>Lịch sử điểm Loyalty</h3>
              <small className="muted">Ghi nhận chi tiết mọi giao dịch cộng điểm khi mua hàng và trừ điểm khi đổi sang Coupon.</small>
            </div>

            {transactions.length === 0 ? (
              <EmptyState
                icon="clock"
                title="Chưa có biến động điểm."
                copy="Khi đơn hàng của bạn được giao thành công, điểm Loyalty sẽ tự động cộng vào tài khoản."
              />
            ) : (
              <div className="stack">
                {transactions.map((tx) => {
                  const isPositive = tx.pointsDelta >= 0;
                  return (
                    <div key={tx.id} className="card-flat row wrap">
                      <div className="stack" style={{ gap: 4 }}>
                        <div className="row wrap gap8">
                          <Badge tone={isPositive ? 'green' : 'orange'}>
                            {tx.type === 'EARN_ORDER' ? 'Tích điểm mua hàng' : 'Đổi sang Coupon'}
                          </Badge>
                          {tx.referenceId && <span className="mono muted">#{tx.referenceId}</span>}
                        </div>
                        <div>{tx.description}</div>
                        <small className="muted">{formatDateTime(tx.createdAt)}</small>
                      </div>
                      <div className="stack push" style={{ textAlign: 'right', gap: 2 }}>
                        <strong style={{ color: isPositive ? 'var(--green, #15803d)' : 'var(--orange, #c2410c)' }}>
                          {isPositive ? `+${tx.pointsDelta}` : tx.pointsDelta} điểm
                        </strong>
                        <small className="muted">Số dư: {tx.balanceAfter} điểm</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </AccountLayout>
  );
};
