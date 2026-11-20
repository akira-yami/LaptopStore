import type { OrderStatus } from '@/modules/order/types';

export type PaymentMethod = 'COD' | 'VNPAY' | 'STORE_CREDIT';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  COD: 'COD',
  VNPAY: 'VNPay',
  STORE_CREDIT: 'StoreCredit',
};

export interface StoreCreditWallet {
  balance: number;
  entries: StoreCreditEntry[];
}

export interface StoreCreditEntry {
  id: number;
  orderId: number;
  kind: 'REFUND' | 'PURCHASE';
  amount: number;
  balanceAfter: number;
  createdAt: string;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export type RefundRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface RefundRequest {
  id: number;
  orderId: number;
  orderStatus: OrderStatus;
  amount: number;
  reason: string;
  status: RefundRequestStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedByUserId: number | null;
  reviewNote: string | null;
  creditedToStoreCredit: boolean;
  evidenceIds: number[];
}

export interface StartPaymentRequest {
  orderId: number;
  method: 'COD' | 'VNPAY';
}

export interface RecordCodPaymentRequest {
  orderId: number;
}

export interface PaymentResponse {
  id: number;
  orderId: number;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  expiresAt: string | null;
}

export interface PaymentSessionResponse {
  paymentId: number;
  paymentUrl: string;
  expiresAt: string | null;
}

export interface VnPayReturnResponse {
  signatureValid: boolean;
  successful: boolean;
  transactionRef: string | null;
  responseCode: string | null;
  transactionStatus: string | null;
  transactionNo: string | null;
  message: string;
}
