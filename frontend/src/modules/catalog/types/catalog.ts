// src/modules/catalog/types/catalog.ts

export interface Brand {
  id: number;
  name: string;
  active: boolean;
}

export interface Category {
  id: number;
  name: string;
  active: boolean;
}

export interface ProductSearchCriteria {
  keyword?: string;
  brandName?: string;
  categoryName?: string;
  status?: string;
  ram?: string;
  storage?: string;
  sortPriceDirection?: string; // "asc" hoặc "desc"
  minPrice?: number;
  maxPrice?: number;

  // Các field dùng cho Pageable của Spring Boot
  sort?: string;
  page?: number;
  size?: number;
}

export interface ProductSummaryResponse {
  id: number;
  name: string;
  brandName: string;
  categoryName: string;
  status: string;
  thumbnailImage: string | null; // null khi sản phẩm chưa có ảnh
  active: boolean;
  startingPrice: number | null; // BigDecimal bên Java; null khi chưa có biến thể
  cpu?: string | null;
  screenSize?: string | null;
  availableConfiguration?: { ram: string | null; storage: string | null; price: number } | null;
}

export interface VariantSnapshot {
  id: number;
  sku: string;
  ram: string;
  storage: string;
  color: string;
  price: number;
  quantity: number;
  status: string;
  /**
   * Trạng thái kinh doanh của biến thể (true: Đang bán, false: Ngừng bán).
   * Thêm trường này giúp giao diện quản lý phân biệt rõ tình trạng từng cấu hình máy.
   */
  active?: boolean;
}



export interface ProductSpecificationDto {
  cpu: string;
  gpu: string;
  screenSize: string;
  screenResolution: string;
  refreshRate: string;
  battery: string;
  weight: string;
  os: string;
}

/**
 * DTO hình ảnh sản phẩm.
 * - Tại sao id là optional (id?: number): Khi người dùng thêm ảnh mới ở client trước khi bấm Lưu,
 *   ảnh chưa có ID sinh từ cơ sở dữ liệu. Sau khi lưu thành công hoặc khi đọc từ backend, id mới có giá trị.
 * - Giữ theo cách cũ (bắt buộc id: number): Sẽ buộc client phải gán id giả lập (như Date.now()),
 *   dễ gây lỗi nhầm lẫn ID và gây lỗi biên dịch TypeScript TS2741.
 * - Xử lý theo cách mới: Type-safe, linh hoạt cho cả form thêm mới lẫn hiển thị.
 */
export interface ProductImageDto {
  id?: number;
  imageUrl: string;
  isPrimary: boolean;
}

export interface ProductResponse {
  id: number;
  name: string;
  description: string;
  status: string;
  brandName: string;
  categoryName: string;
  specification: ProductSpecificationDto | null;
  images: ProductImageDto[] | null;
  variants: VariantSnapshot[] | null;
}
