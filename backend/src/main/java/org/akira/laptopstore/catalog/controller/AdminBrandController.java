package org.akira.laptopstore.catalog.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.akira.laptopstore.catalog.dto.request.CreateBrandRequest;
import org.akira.laptopstore.catalog.dto.request.UpdateBrandRequest;
import org.akira.laptopstore.catalog.dto.response.BrandResponse;
import org.akira.laptopstore.catalog.service.BrandService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/*
 * =========================================================================
 * [TẠI SAO THAY ĐỔI & BẢN CHẤT NGHIỆP VỤ - AdminBrandController]:
 * 1. Tại sao thay đổi:
 *    - Nâng cấp @PreAuthorize lên cấp class thành `hasAnyRole('STAFF', 'ADMIN')`
 *      để cả nhân viên và admin đều có thể quản lý thương hiệu máy tính.
 *    - Bổ sung endpoint GET `/api/v1/admin/brands` để màn hình quản trị lấy
 *      danh sách thương hiệu với đầy đủ thông tin phục vụ bảng quản lý.
 * 2. Giữ theo cách cũ thì ảnh hưởng xấu gì:
 *    - Trước đây chỉ có @PreAuthorize("hasRole('ADMIN')") lẻ tẻ ở từng method write,
 *      không có endpoint GET trong AdminBrandController (chỉ có bên BrandController public
 *      lọc active = true). Staff bị lỗi 403 khi vào màn quản lý thương hiệu và không có
 *      API lấy danh sách quản trị tập trung.
 * 3. Xử lý theo cách mới được lợi gì:
 *    - Phân quyền method security nhất quán ngay tại đầu class (DRY), loại bỏ các annotation lẻ tẻ.
 *    - Staff và Admin cùng thao tác quản lý thương hiệu thông suốt, hỗ trợ đầy đủ CRUD.
 * =========================================================================
 */
@RestController
@RequestMapping("/api/v1/admin/brands")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
public class AdminBrandController {

    private final BrandService brandService;

    // Lấy toàn bộ thương hiệu cho giao diện quản trị của Staff/Admin
    @GetMapping
    public ResponseEntity<List<BrandResponse>> getAllBrands() {
        return ResponseEntity.ok(brandService.findAllBrands());
    }


    @PostMapping
    public ResponseEntity<BrandResponse> createBrand(@Valid @RequestBody CreateBrandRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(brandService.createBrand(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BrandResponse> updateBrand(
            @PathVariable Long id, 
            @Valid @RequestBody UpdateBrandRequest request) {
        return ResponseEntity.ok(brandService.updateBrand(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteBrand(@PathVariable Long id) {
        brandService.deleteBrand(id);
        return ResponseEntity.ok("Xóa thương hiệu thành công!");
    }
}

