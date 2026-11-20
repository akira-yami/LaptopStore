import { apiClient } from '@/services/api/apiClient';
import {
    CheckoutPreviewRequest,
    CheckoutPreviewResponse,
    CreateOrderRequest,
    OrderDashboardSummary,
    OrderDetail,
    OrderStatus,
    OrderSummary,
    PageResponse,
} from '../types';

export const orderApi = {
  getMine: async (params?: { page?: number; size?: number; status?: OrderStatus[] }): Promise<PageResponse<OrderSummary>> => {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.append('page', String(params.page));
    if (params?.size !== undefined) query.append('size', String(params.size));
    params?.status?.forEach((s) => query.append('status', s));
    const qs = query.toString();
    return (await apiClient.get<PageResponse<OrderSummary>>(qs ? `/me/orders?${qs}` : '/me/orders')).data;
  },

  getMineById: async (orderId: string): Promise<OrderDetail> => (
    await apiClient.get<OrderDetail>(`/me/orders/${orderId}`)
  ).data,

  getAllForStaff: async (params?: { page?: number; size?: number; status?: OrderStatus | ''; keyword?: string }): Promise<PageResponse<OrderSummary>> => {
    const query: Record<string, string | number> = {};
    if (params?.page !== undefined) query.page = params.page;
    if (params?.size !== undefined) query.size = params.size;
    if (params?.status) query.status = params.status;
    if (params?.keyword && params.keyword.trim()) query.keyword = params.keyword.trim();
    return (await apiClient.get<PageResponse<OrderSummary>>('/staff/orders', { params: query })).data;
  },

  getStaffOrderById: async (orderId: number): Promise<OrderDetail> => (
    await apiClient.get<OrderDetail>(`/staff/orders/${orderId}`)
  ).data,

  getDashboardSummary: async (): Promise<OrderDashboardSummary> => (
    await apiClient.get<OrderDashboardSummary>('/staff/orders/summary')
  ).data,

  updateStatus: async (orderId: number, status: OrderStatus, note?: string): Promise<OrderDetail> => (
    await apiClient.put<OrderDetail>(`/staff/orders/${orderId}/status`, { status, note })
  ).data,

  cancelOrder: async (orderId: number, reason?: string): Promise<OrderDetail> => (
    await apiClient.post<OrderDetail>(`/me/orders/${orderId}/cancel`, null, {
      params: reason ? { reason } : undefined,
    })
  ).data,

  previewCheckout: async (payload: CheckoutPreviewRequest): Promise<CheckoutPreviewResponse> => (
    await apiClient.post<CheckoutPreviewResponse>('/me/orders/preview', payload)
  ).data,

  createOrder: async (payload: CreateOrderRequest, idempotencyKey?: string): Promise<OrderDetail> => (
    await apiClient.post<OrderDetail>('/me/orders', payload, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    })
  ).data,
};
