export interface UserProfile {
  id: number;
  email: string;
  fullName?: string;
  phone?: string;
  status: string;
  roles: string[];
  createdAt: string;
}

export interface Address {
  id: number;
  userId: number;
  recipientName: string;
  phone: string;
  ward?: string;
  district?: string;
  city: string;
  street: string;
  postalCode?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
}

export interface CreateAddressRequest {
  recipientName: string;
  phone: string;
  ward?: string;
  district?: string;
  city: string;
  street: string;
  postalCode?: string;
  isDefault?: boolean;
}

export type LoyaltyDiscountType = 'PERCENT' | 'FIXED';
export type LoyaltyTransactionType = 'EARN_ORDER' | 'REDEEM_COUPON';

export interface AvailableCoupon {
  id: number;
  code: string;
  discountType: LoyaltyDiscountType;
  discountValue: number;
  maxDiscount?: number | null;
  minOrderAmount?: number | null;
  usageLimit?: number | null;
  usagePerUser?: number | null;
  remainingTotalUses?: number | null;
  remainingUserUses?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  personal: boolean;
}

export interface LoyaltyRewardTier {
  tierCode: string;
  title: string;
  pointsCost: number;
  discountType: LoyaltyDiscountType;
  discountValue: number;
  minOrderAmount?: number | null;
  validDays: number;
  description: string;
}

export interface LoyaltyTransaction {
  id: number;
  type: LoyaltyTransactionType;
  pointsDelta: number;
  balanceAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface LoyaltyOverview {
  pointsBalance: number;
  totalEarned: number;
  totalRedeemed: number;
  vndPerPoint: number;
  rewardTiers: LoyaltyRewardTier[];
  transactions: LoyaltyTransaction[];
  availableCoupons: AvailableCoupon[];
}

export interface LoyaltyRedeemResponse {
  coupon: AvailableCoupon;
  pointsBalance: number;
  totalRedeemed: number;
  message: string;
}

