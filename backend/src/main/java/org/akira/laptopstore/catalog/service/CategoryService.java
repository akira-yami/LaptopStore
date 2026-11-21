package org.akira.laptopstore.catalog.service;

import org.akira.laptopstore.catalog.dto.request.CreateCategoryRequest;
import org.akira.laptopstore.catalog.dto.request.UpdateCategoryRequest;
import org.akira.laptopstore.catalog.dto.response.CategoryResponse;

import java.util.List;

public interface CategoryService {

    // Hàm dành cho khách hàng: chỉ lấy danh mục đang hoạt động (active = true)
    List<CategoryResponse> findAllCategories();

    // Hàm dành cho Admin/Staff: lấy toàn bộ danh mục (kể cả active = false / tạm ẩn)
    List<CategoryResponse> findAllCategoriesForAdmin();

    CategoryResponse findCategoryById(Long id);

    CategoryResponse createCategory(CreateCategoryRequest request);
    CategoryResponse updateCategory(Long id, UpdateCategoryRequest request);
    void deleteCategory(Long id);
    void updateCategoryStatus(Long id, boolean active);
}
