package org.akira.laptopstore.catalog.service;

import org.akira.laptopstore.catalog.dto.request.CreateProductRequest;
import org.akira.laptopstore.catalog.dto.request.CreateVariantRequest;
import org.akira.laptopstore.catalog.dto.request.UpdateProductImageRequest;
import org.akira.laptopstore.catalog.dto.request.UpdateProductRequest;

import org.akira.laptopstore.catalog.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.akira.laptopstore.catalog.dto.response.ProductResponse;
import org.akira.laptopstore.catalog.dto.response.ProductImageDto;
import org.akira.laptopstore.catalog.dto.response.ProductSpecificationDto;

import org.akira.laptopstore.catalog.dto.response.ProductSummaryResponse;
import org.akira.laptopstore.catalog.dto.request.ProductSearchCriteria;

import java.util.List;

public interface ProductService {
    List<ProductResponse> findAllProducts();

    ProductResponse findProductById(Long id);

    // Đổi tham số từ Product sang CreateProductRequest
    Product createProduct(CreateProductRequest request);

    Product updateProduct(Long id, UpdateProductRequest request);

    // Khai báo thêm hàm thay đổi trạng thái
    void toggleProductStatus(Long productId, String status);

    Page<ProductSummaryResponse> searchAndFilterProducts(ProductSearchCriteria criteria, Pageable pageable);

    List<ProductImageDto> getProductImages(Long productId);

    /*
     * =========================================================================
     * [TẠI SAO THAY ĐỔI & BẢN CHẤT NGHIỆP VỤ - updateProductImages]:
     * - Tại sao thay đổi: Bổ sung hợp đồng nghiệp vụ cập nhật danh sách ảnh cho sản phẩm.
     * - Giữ theo cách cũ: Hệ thống chỉ hỗ trợ đọc ảnh `getProductImages`, không có phương thức
     *   nào cho phép cập nhật, thay đổi hoặc quản lý nhiều ảnh từ màn hình quản trị.
     * - Xử lý theo cách mới được lợi gì:
     *   Cho phép lưu trữ, sắp xếp, bổ sung nhiều ảnh chi tiết và tự động thiết lập ảnh đại diện isPrimary.
     * =========================================================================
     */
    List<ProductImageDto> updateProductImages(Long productId, List<UpdateProductImageRequest> images);

    ProductSpecificationDto getProductSpecification(Long productId);


}