import { apiClient } from '@/services/api/apiClient';
import type { PageResponse } from '@/modules/order/types';
import type { RefundRequest, RefundRequestStatus } from '../types';

export const refundApi = {
  getLatest: async (orderId: number): Promise<RefundRequest | null> => {
    const response = await apiClient.get<RefundRequest>(`/me/orders/${orderId}/refund-request`);
    return response.status === 204 ? null : response.data;
  },

  submit: async (orderId: number, reason: string, images: File[]): Promise<RefundRequest> => {
    const body = new FormData();
    body.append('reason', reason);
    images.forEach((image) => body.append('images', image));
    const response = await apiClient.post<RefundRequest>(`/me/orders/${orderId}/refund-request`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  list: async (page: number, status: RefundRequestStatus, orderIds?: number[]): Promise<PageResponse<RefundRequest>> => (
    await apiClient.get<PageResponse<RefundRequest>>('/admin/refund-requests', {
      params: { page, status, orderIds: orderIds?.join(',') },
    })
  ).data,

  review: async (requestId: number, approved: boolean, note?: string, returnOrder = false): Promise<RefundRequest> => (
    await apiClient.put<RefundRequest>(`/admin/refund-requests/${requestId}/decision`, { approved, returnOrder, note })
  ).data,

  getEvidence: async (requestId: number, evidenceId: number, scope: 'me' | 'admin'): Promise<Blob> => (
    await apiClient.get<Blob>(`/${scope}/refund-requests/${requestId}/evidence/${evidenceId}`, { responseType: 'blob' })
  ).data,
};
