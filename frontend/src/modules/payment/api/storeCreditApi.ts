import { apiClient } from '@/services/api/apiClient';
import type { StoreCreditWallet } from '../types';

export const storeCreditApi = {
  getWallet: async (): Promise<StoreCreditWallet> => (
    await apiClient.get<StoreCreditWallet>('/me/store-credit')
  ).data,
};
