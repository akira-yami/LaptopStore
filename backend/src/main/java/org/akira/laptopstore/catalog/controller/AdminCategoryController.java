package org.akira.laptopstore.catalog.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.akira.laptopstore.catalog.dto.request.CreateCategoryRequest;
import org.akira.laptopstore.catalog.dto.request.UpdateCategoryRequest;
import org.akira.laptopstore.catalog.dto.response.CategoryResponse;
import org.akira.laptopstore.catalog.service.CategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;


/*
 * =========================================================================
 * [TẠI SAO THAY ĐỔI & BẢN CHẤT NGHIỆP VỤ - AdminCategoryController]:
 * 1. Tại sao thay đổi:
 *    - Đồng bộ quyền truy cập với AdminBrandController và AdminProductController,
 *      áp dụng @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')") ở mức class.
 *    - Thêm endpoint GET `/api/v1/admin/categories` phục vụ màn hình quản trị của Staff/Admin.
 * 2. Giữ theo cách cũ thì ảnh hưởng xấu gì:
 *    - Staff chỉ truy cập được API public của khách hàng (bị lọc dữ liệu), không thể
 *      thao tác quản lý danh mục trong ca làm việc, gặp lỗi 403 Forbidden nếu gọi nhánh admin.
 * 3. Xử lý theo cách mới được lợi gì:
 *    - Chuẩn hóa toàn bộ bộ 3 controller Catalog quản trị (Brand, Category, Product)
 *      dưới cùng một cơ chế phân quyền STAFF/ADMIN nhất quán, code gọn gàng, tránh sót quyền.
 * =========================================================================
 */
@RestController
@RequestMapping("/api/v1/admin/categories")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
public class AdminCategoryController {
    private final CategoryService categoryService;

    // Lấy toàn bộ danh mục cho phân hệ quản trị
    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(categoryService.findAllCategories());
    }


    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(@Valid @RequestBody CreateCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.createCategory(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCategoryRequest request) {
        return ResponseEntity.ok(categoryService.updateCategory(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.ok("Xóa danh mục thành công!");
    }
}

