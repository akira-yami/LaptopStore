import { apiClient } from '@/services/api/apiClient';
import {
  PaymentResponse,
  PaymentSessionResponse,
  RecordCodPaymentRequest,
  StartPaymentRequest,
  VnPayReturnResponse,
} from '../types';

export const paymentApi = {
  startPayment: async (payload: StartPaymentRequest): Promise<PaymentResponse> => (
    await apiClient.post<PaymentResponse>('/payments', payload)
  ).data,

  getById: async (paymentId: number): Promise<PaymentResponse> => (
    await apiClient.get<PaymentResponse>(`/payments/${paymentId}`)
  ).data,

  getByOrder: async (orderId: number): Promise<PaymentResponse> => (
    await apiClient.get<PaymentResponse>(`/payments/order/${orderId}`)
  ).data,

  getByOrderIdsForStaff: async (orderIds: number[]): Promise<PaymentResponse[]> => {
    if (orderIds.length === 0) return [];
    const params = new URLSearchParams();
    orderIds.forEach((id) => params.append('orderIds', String(id)));
    return (await apiClient.get<PaymentResponse[]>(`/payments/staff/by-orders?${params.toString()}`)).data;
  },

  createVnpaySession: async (paymentId: number): Promise<PaymentSessionResponse> => (
    await apiClient.post<PaymentSessionResponse>(`/payments/${paymentId}/vnpay-session`)
  ).data,

  recordCodPayment: async (payload: RecordCodPaymentRequest): Promise<PaymentResponse> => (
    await apiClient.put<PaymentResponse>('/payments/cod', payload)
  ).data,

  inspectVnpayReturn: async (params: Record<string, string>): Promise<VnPayReturnResponse> => (
    await apiClient.get<VnPayReturnResponse>('/payments/vnpay/return', { params })
  ).data,
};
