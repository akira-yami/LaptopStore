import { apiClient } from '@/services/api/apiClient';
import { Brand, CreateBrandRequest, UpdateBrandRequest } from '../types';

/*
 * =========================================================================
 * [TẠI SAO THAY ĐỔI & BẢN CHẤT NGHIỆP VỤ - brandApi]:
 * 1. Tại sao thay đổi:
 *    - `getAllBrands`: Chuyển endpoint gọi sang `/api/v1/admin/brands` dành cho màn hình quản trị.
 *    - Thêm `getPublicBrands`: Gọi `/api/v1/brands` phục vụ khách hàng ngoài trang chủ / bộ lọc.
 * 2. Giữ theo cách cũ thì ảnh hưởng xấu gì:
 *    - Cách cũ `getAllBrands` chọc vào `/api/v1/brands` của khách hàng nên các thương hiệu tạm ẩn
 *      hoặc dữ liệu quản lý bị giới hạn, không phản ánh đúng bảng danh mục quản trị.
 * 3. Xử lý theo cách mới được lợi gì:
 *    - Tách bạch rõ ràng giữa API quản trị (Admin/Staff) và API công khai cho khách hàng.
 * =========================================================================
 */
export const brandApi = {
    // API quản trị danh sách thương hiệu cho Staff và Admin
    getAllBrands: async (): Promise<Brand[]> => {
        const response = await apiClient.get<Brand[]>('/api/v1/admin/brands');
        return response.data;
    },

    // API công khai cho người dùng duyệt mua sản phẩm
    getPublicBrands: async (): Promise<Brand[]> => {
        const response = await apiClient.get<Brand[]>('/api/v1/brands');
        return response.data;
    },


    getBrandById: async (id: number): Promise<Brand> => {
        const response = await apiClient.get<Brand>(`/api/v1/brands/${id}`);
        return response.data;
    },

    createBrand: async (data: CreateBrandRequest): Promise<Brand> => {
        const response = await apiClient.post<Brand>('/api/v1/admin/brands', data);
        return response.data;
    },

    updateBrand: async (id: number, data: UpdateBrandRequest): Promise<Brand> => {
        const response = await apiClient.put<Brand>(`/api/v1/admin/brands/${id}`, data);
        return response.data;
    },

    deleteBrand: async (id: number): Promise<string> => {
        const response = await apiClient.delete<string>(`/api/v1/admin/brands/${id}`);
        return response.data;
    },
};
