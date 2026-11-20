import { apiClient } from '@/services/api/apiClient';
import {
  Address,
  AvailableCoupon,
  CreateAddressRequest,
  LoyaltyOverview,
  LoyaltyRedeemResponse,
  UpdateProfileRequest,
  UserProfile,
} from '../types';

export const userApi = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/me');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const response = await apiClient.patch<UserProfile>('/me', data);
    return response.data;
  },

  getAddresses: async (): Promise<Address[]> => {
    const response = await apiClient.get<Address[]>('/me/addresses');
    return response.data;
  },

  createAddress: async (data: CreateAddressRequest): Promise<Address> => {
    const response = await apiClient.post<Address>('/me/addresses', data);
    return response.data;
  },

  deleteAddress: async (id: number): Promise<void> => {
    await apiClient.delete(`/me/addresses/${id}`);
  },

  getLoyaltyOverview: async (): Promise<LoyaltyOverview> => {
    const response = await apiClient.get<LoyaltyOverview>('/me/loyalty');
    return response.data;
  },

  redeemLoyaltyCoupon: async (tierCode: string): Promise<LoyaltyRedeemResponse> => {
    const response = await apiClient.post<LoyaltyRedeemResponse>('/me/loyalty/redeem', { tierCode });
    return response.data;
  },

  getAvailableCoupons: async (): Promise<AvailableCoupon[]> => {
    const response = await apiClient.get<AvailableCoupon[]>('/me/coupons/available');
    return response.data;
  },
};

export const adminUserApi = {
  getAllUsers: async (): Promise<UserProfile[]> => {
    const response = await apiClient.get<UserProfile[]>('/admin/users');
    return response.data;
  },

  updateUserStatus: async (id: number, status: string): Promise<UserProfile> => {
    const response = await apiClient.patch<UserProfile>(`/admin/users/${id}/status`, { status });
    return response.data;
  },

  updateUserRoles: async (id: number, roles: string[]): Promise<UserProfile> => {
    const response = await apiClient.patch<UserProfile>(`/admin/users/${id}/roles`, { roles });
    return response.data;
  },
};
