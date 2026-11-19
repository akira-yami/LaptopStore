export type PaymentMethod = 'COD' | 'VNPAY';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export interface StartPaymentRequest {
  orderId: number;
  method: PaymentMethod;
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
