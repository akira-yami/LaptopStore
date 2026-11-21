package org.akira.laptopstore.catalog.service;

import org.akira.laptopstore.catalog.dto.request.CreateBrandRequest;
import org.akira.laptopstore.catalog.dto.request.UpdateBrandRequest;
import org.akira.laptopstore.catalog.dto.response.BrandResponse;

import java.util.List;

public interface BrandService {
    
    // Hàm dành cho khách hàng: chỉ lấy thương hiệu đang hoạt động (active = true)
    List<BrandResponse> findAllBrands();

    // Hàm dành cho Admin/Staff: lấy toàn bộ thương hiệu (kể cả active = false / tạm ẩn)
    List<BrandResponse> findAllBrandsForAdmin();

    BrandResponse findBrandById(Long id);

    BrandResponse createBrand(CreateBrandRequest request);
    BrandResponse updateBrand(Long id, UpdateBrandRequest request);
    void deleteBrand(Long id);
    void updateBrandStatus(Long id, boolean active);
}
