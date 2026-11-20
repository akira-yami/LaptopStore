package org.akira.laptopstore.catalog.controller;

/*
 * =========================================================================
 * [TẬP TEST TỰ ĐỘNG - BƯỚC RED TRONG CHU KỲ TDD - AdminBrandControllerTest]:
 * - Tại sao tạo file này:
 *   + Tuân thủ nguyên tắc "Tests BEFORE Code": viết test mô tả các hành vi quản trị
 *     thương hiệu (lấy danh sách, tạo mới, cập nhật, xóa mềm) trước khi sửa logic.
 * - Giữ theo cách cũ thì ảnh hưởng xấu gì:
 *   + Không có unit test bao phủ controller AdminBrandController khiến việc phân quyền
 *     hoặc refactor dễ gây lỗi 403 Forbidden hoặc 500 ngầm mà không phát hiện được.
 * - Xử lý theo cách mới được lợi gì:
 *   + Đạt 100% tỷ lệ pass, bảo đảm hợp đồng RESTful API giữa Frontend và Backend luôn ổn định.
 * =========================================================================
 */

import org.akira.laptopstore.catalog.dto.request.CreateBrandRequest;

import org.akira.laptopstore.catalog.dto.request.UpdateBrandRequest;
import org.akira.laptopstore.catalog.dto.response.BrandResponse;
import org.akira.laptopstore.catalog.service.BrandService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminBrandControllerTest {

    @Mock
    private BrandService brandService;

    @InjectMocks
    private AdminBrandController adminBrandController;

    @Test
    @DisplayName("Staff hoặc Admin lấy danh sách toàn bộ thương hiệu quản lý")
    void getAllBrands_ShouldReturnList() {
        BrandResponse b1 = BrandResponse.builder().id(1L).name("ASUS").active(true).build();
        BrandResponse b2 = BrandResponse.builder().id(2L).name("DELL").active(true).build();
        when(brandService.findAllBrands()).thenReturn(List.of(b1, b2));

        ResponseEntity<List<BrandResponse>> response = adminBrandController.getAllBrands();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());
        verify(brandService).findAllBrands();
    }

    @Test
    @DisplayName("Admin hoặc Staff tạo thương hiệu mới thành công (201 Created)")
    void createBrand_ShouldReturn201() {
        CreateBrandRequest request = new CreateBrandRequest("Apple", "Thương hiệu MacBook");
        BrandResponse mockResponse = BrandResponse.builder().id(3L).name("Apple").description("Thương hiệu MacBook").active(true).build();

        when(brandService.createBrand(any(CreateBrandRequest.class))).thenReturn(mockResponse);

        ResponseEntity<BrandResponse> response = adminBrandController.createBrand(request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Apple", response.getBody().getName());
        verify(brandService).createBrand(request);
    }

    @Test
    @DisplayName("Admin hoặc Staff cập nhật thương hiệu thành công (200 OK)")
    void updateBrand_ShouldReturn200() {
        UpdateBrandRequest request = new UpdateBrandRequest("Apple M-Series", "MacBook Pro & Air");
        BrandResponse mockResponse = BrandResponse.builder().id(3L).name("Apple M-Series").description("MacBook Pro & Air").active(true).build();

        when(brandService.updateBrand(eq(3L), any(UpdateBrandRequest.class))).thenReturn(mockResponse);

        ResponseEntity<BrandResponse> response = adminBrandController.updateBrand(3L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Apple M-Series", response.getBody().getName());
        verify(brandService).updateBrand(3L, request);
    }

    @Test
    @DisplayName("Admin hoặc Staff xóa thương hiệu thành công (200 OK)")
    void deleteBrand_ShouldReturn200() {
        doNothing().when(brandService).deleteBrand(3L);

        ResponseEntity<String> response = adminBrandController.deleteBrand(3L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Xóa thương hiệu thành công!", response.getBody());
        verify(brandService).deleteBrand(3L);
    }
}
