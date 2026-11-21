package org.akira.laptopstore.catalog.service.impl;

import org.akira.laptopstore.catalog.dto.request.CreateVariantRequest;
import org.akira.laptopstore.catalog.dto.request.UpdateVariantRequest;
import org.akira.laptopstore.catalog.dto.response.VariantSnapshot;
import org.akira.laptopstore.catalog.entity.Product;
import org.akira.laptopstore.catalog.entity.ProductVariant;
import org.akira.laptopstore.catalog.mapper.ProductMapper;
import org.akira.laptopstore.catalog.repository.ProductRepository;
import org.akira.laptopstore.catalog.repository.ProductVariantRepository;
import org.akira.laptopstore.exception.BusinessException;
import org.akira.laptopstore.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductVariantServiceImplTest {

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductMapper productMapper;

    private ProductVariantServiceImpl productVariantService;

    private Product sampleProduct;

    @BeforeEach
    void setUp() {
        productVariantService = new ProductVariantServiceImpl(
                productVariantRepository,
                productRepository,
                productMapper
        );

        sampleProduct = Product.builder().id(1L).name("Dell XPS 15").build();
    }

    @Test
    @DisplayName("Sửa biến thể đang tạm ngừng bán (active = false) thành công qua findByIdNative mà không bị 404")
    void updateVariant_inactiveVariant_success() {
        ProductVariant inactiveVariant = ProductVariant.builder()
                .id(10L)
                .product(sampleProduct)
                .sku("DELL-OLD-01")
                .price(BigDecimal.valueOf(20000000))
                .ram("8GB")
                .storage("256GB")
                .color("Đen")
                .status("INACTIVE")
                .active(false)
                .build();

        when(productVariantRepository.findByIdNative(10L)).thenReturn(Optional.of(inactiveVariant));
        when(productVariantRepository.existsBySkuAndIdNotNative(eq("DELL-NEW-01"), eq(10L))).thenReturn(false);
        when(productVariantRepository.save(any(ProductVariant.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VariantSnapshot snapshot = VariantSnapshot.builder()
                .id(10L)
                .sku("DELL-NEW-01")
                .price(BigDecimal.valueOf(22000000))
                .status("INACTIVE")
                .active(false)
                .build();
        when(productMapper.toVariantSnapshot(any(ProductVariant.class))).thenReturn(snapshot);

        UpdateVariantRequest request = UpdateVariantRequest.builder()
                .sku("DELL-NEW-01")
                .price(BigDecimal.valueOf(22000000))
                .ram("16GB")
                .storage("512GB")
                .color("Bạc")
                .status("INACTIVE")
                .build();

        VariantSnapshot result = productVariantService.updateVariant(1L, 10L, request);

        assertNotNull(result);
        assertEquals("DELL-NEW-01", result.getSku());
        assertEquals(false, result.getActive(), "Trạng thái active=false vẫn được bảo toàn");
        verify(productVariantRepository).findByIdNative(10L);
    }

    @Test
    @DisplayName("Trùng SKU với biến thể khác (kể cả biến thể đang active = false) -> ném BusinessException 400 SKU_ALREADY_EXISTS")
    void updateVariant_duplicateSkuWithInactiveVariant_throws400() {
        ProductVariant variant = ProductVariant.builder()
                .id(10L)
                .product(sampleProduct)
                .sku("DELL-OLD-01")
                .price(BigDecimal.valueOf(20000000))
                .active(true)
                .build();

        when(productVariantRepository.findByIdNative(10L)).thenReturn(Optional.of(variant));
        when(productVariantRepository.existsBySkuAndIdNotNative(eq("EXISTING-SKU"), eq(10L))).thenReturn(true);

        UpdateVariantRequest request = UpdateVariantRequest.builder()
                .sku("EXISTING-SKU")
                .price(BigDecimal.valueOf(22000000))
                .ram("16GB")
                .storage("512GB")
                .color("Bạc")
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () -> productVariantService.updateVariant(1L, 10L, request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("SKU_ALREADY_EXISTS", ex.getCode());
    }

    @Test
    @DisplayName("Cập nhật trạng thái active của biến thể đồng bộ cả active và status")
    void updateVariantActiveStatus_syncsBothActiveAndStatus() {
        when(productVariantRepository.updateActiveStatusAndStatus(1L, 10L, false, "INACTIVE")).thenReturn(1);

        assertDoesNotThrow(() -> productVariantService.updateVariantActiveStatus(1L, 10L, false));

        verify(productVariantRepository).updateActiveStatusAndStatus(1L, 10L, false, "INACTIVE");
    }

    @Test
    @DisplayName("getVariantById gọi findByIdNative để xem được cả biến thể ngừng bán")
    void getVariantById_inactiveVariant_returnsSnapshot() {
        ProductVariant inactiveVariant = ProductVariant.builder()
                .id(10L)
                .product(sampleProduct)
                .sku("DELL-OLD-01")
                .price(BigDecimal.valueOf(20000000))
                .active(false)
                .build();

        when(productVariantRepository.findByIdNative(10L)).thenReturn(Optional.of(inactiveVariant));
        when(productMapper.toVariantSnapshot(inactiveVariant)).thenReturn(VariantSnapshot.builder().id(10L).sku("DELL-OLD-01").active(false).build());

        VariantSnapshot result = productVariantService.getVariantById(1L, 10L);

        assertNotNull(result);
        assertEquals(false, result.getActive());
        verify(productVariantRepository).findByIdNative(10L);
    }
}
