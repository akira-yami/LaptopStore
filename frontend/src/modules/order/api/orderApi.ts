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
  getMine: async (): Promise<PageResponse<OrderSummary>> => (
    await apiClient.get<PageResponse<OrderSummary>>('/me/orders')
  ).data,

  getMineById: async (orderId: string): Promise<OrderDetail> => (
    await apiClient.get<OrderDetail>(`/me/orders/${orderId}`)
  ).data,

  getAllForStaff: async (params?: { page?: number; size?: number }): Promise<PageResponse<OrderSummary>> => (
    await apiClient.get<PageResponse<OrderSummary>>('/staff/orders', { params })
  ).data,

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
