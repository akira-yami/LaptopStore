package org.akira.laptopstore.catalog.controller;

/*
 * =========================================================================
 * [TẬP TEST TỰ ĐỘNG - BƯỚC RED TRONG CHU KỲ TDD - AdminProductVariantAndImageTest]:
 * - Tại sao tạo file này:
 *   + Kiểm thử chuyên sâu 2 tính năng quan trọng: chỉnh sửa biến thể/trạng thái bán của variant
 *     và cập nhật bộ sưu tập nhiều ảnh cho sản phẩm.
 * - Giữ theo cách cũ thì ảnh hưởng xấu gì:
 *   + Không kiểm thử tự động việc bật/tắt bán variant hay gán ảnh chính `isPrimary`
 *     dễ dẫn đến lỗi biên dữ liệu: biến thể ngừng bán vẫn cho checkout, hoặc sản phẩm mất ảnh đại diện.
 * - Xử lý theo cách mới được lợi gì:
 *   + Chứng minh mã xử lý đạt chuẩn TDD (RED -> GREEN), kiểm soát chặt chẽ từng trường dữ liệu trả về.
 * =========================================================================
 */

import org.akira.laptopstore.catalog.dto.request.CreateVariantRequest;

import org.akira.laptopstore.catalog.dto.request.UpdateVariantRequest;
import org.akira.laptopstore.catalog.dto.response.ProductImageDto;
import org.akira.laptopstore.catalog.dto.response.VariantSnapshot;
import org.akira.laptopstore.catalog.service.ProductService;
import org.akira.laptopstore.catalog.service.ProductVariantService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminProductVariantAndImageTest {

    @Mock
    private ProductService productService;

    @Mock
    private ProductVariantService productVariantService;

    @InjectMocks
    private AdminProductController adminProductController;

    @Test
    @DisplayName("Cập nhật thông tin biến thể sản phẩm thành công (200 OK)")
    void updateVariant_ShouldReturnUpdatedSnapshot() {
        UpdateVariantRequest request = UpdateVariantRequest.builder()
                .sku("ASUS-ZEN-01")
                .variantName("16GB - 512GB")
                .price(BigDecimal.valueOf(25000000))
                .status("ACTIVE")
                .color("Xám")
                .ram("16GB")
                .storage("512GB")
                .build();

        VariantSnapshot snapshot = VariantSnapshot.builder()
                .id(10L)
                .sku("ASUS-ZEN-01")
                .price(BigDecimal.valueOf(25000000))
                .color("Xám")
                .ram("16GB")
                .storage("512GB")
                .status("ACTIVE")
                .active(true)
                .build();

        when(productVariantService.updateVariant(eq(1L), eq(10L), any(UpdateVariantRequest.class)))
                .thenReturn(snapshot);

        ResponseEntity<VariantSnapshot> response = adminProductController.updateVariant(1L, 10L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("ASUS-ZEN-01", response.getBody().getSku());
        assertEquals(BigDecimal.valueOf(25000000), response.getBody().getPrice());
        verify(productVariantService).updateVariant(eq(1L), eq(10L), any(UpdateVariantRequest.class));
    }

    @Test
    @DisplayName("Cập nhật trạng thái bán / ngừng bán của biến thể (active=false/true)")
    void updateVariantStatus_ShouldReturnSuccessMessage() {
        doNothing().when(productVariantService).updateVariantActiveStatus(1L, 10L, false);

        ResponseEntity<String> response = adminProductController.updateVariantStatus(1L, 10L, false);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Hủy kích hoạt (Ngừng kinh doanh) biến thể thành công!", response.getBody());
        verify(productVariantService).updateVariantActiveStatus(1L, 10L, false);
    }

    @Test
    @DisplayName("Thêm hoặc cập nhật danh sách ảnh của sản phẩm (nhiều ảnh)")
    void updateProductImages_ShouldReturnUpdatedImageList() {
        List<ProductImageDto> updatedImages = List.of(
                ProductImageDto.builder().id(1L).imageUrl("/uploads/products/p1-front.jpg").isPrimary(true).build(),
                ProductImageDto.builder().id(2L).imageUrl("/uploads/products/p1-side.jpg").isPrimary(false).build()
        );

        when(productService.updateProductImages(eq(1L), anyList())).thenReturn(updatedImages);

        ResponseEntity<List<ProductImageDto>> response = adminProductController.updateProductImages(1L, updatedImages);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());
        assertEquals(true, response.getBody().get(0).getIsPrimary());
        verify(productService).updateProductImages(eq(1L), anyList());
    }
}
