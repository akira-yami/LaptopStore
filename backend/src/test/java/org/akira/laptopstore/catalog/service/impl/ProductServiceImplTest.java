package org.akira.laptopstore.catalog.service.impl;

import org.akira.laptopstore.catalog.dto.request.UpdateProductImageRequest;
import org.akira.laptopstore.catalog.dto.response.ProductImageDto;
import org.akira.laptopstore.catalog.entity.Product;
import org.akira.laptopstore.catalog.entity.ProductImage;
import org.akira.laptopstore.catalog.mapper.ProductMapper;
import org.akira.laptopstore.catalog.repository.*;
import org.akira.laptopstore.exception.BusinessException;
import org.akira.laptopstore.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceImplTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private BrandRepository brandRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private ProductImageRepository productImageRepository;

    @Mock
    private ProductSpecificationRepository productSpecificationRepository;

    @Mock
    private ProductMapper productMapper;

    private ProductServiceImpl productService;

    private Product sampleProduct;

    @BeforeEach
    void setUp() {
        productService = new ProductServiceImpl(
                productRepository,
                categoryRepository,
                brandRepository,
                productVariantRepository,
                productMapper,
                productImageRepository,
                productSpecificationRepository
        );

        sampleProduct = Product.builder()
                .id(1L)
                .name("MacBook Pro 16")
                .description("Apple M3 Max")
                .build();
    }

    @Test
    @DisplayName("Kịch bản 1: Danh sách có nhiều ảnh isPrimary = true -> chỉ giữ duy nhất 1 ảnh chính (ảnh đầu tiên có isPrimary)")
    void updateProductImages_multiplePrimaries_keepsOnlyFirst() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));
        when(productImageRepository.findByProductId(1L)).thenReturn(Collections.emptyList());

        List<UpdateProductImageRequest> dtos = List.of(
                UpdateProductImageRequest.builder().imageUrl("/uploads/img1.jpg").isPrimary(true).build(),
                UpdateProductImageRequest.builder().imageUrl("/uploads/img2.jpg").isPrimary(true).build(),
                UpdateProductImageRequest.builder().imageUrl("/uploads/img3.jpg").isPrimary(false).build()
        );

        when(productImageRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productMapper.toProductImageDtoList(anyList())).thenAnswer(invocation -> {
            List<ProductImage> imgs = invocation.getArgument(0);
            return imgs.stream().map(i -> ProductImageDto.builder().imageUrl(i.getImageUrl()).isPrimary(i.getIsPrimary()).build()).toList();
        });

        List<ProductImageDto> result = productService.updateProductImages(1L, dtos);

        assertNotNull(result);
        assertEquals(3, result.size());
        assertTrue(result.get(0).getIsPrimary(), "Ảnh thứ nhất phải là ảnh chính");
        assertFalse(result.get(1).getIsPrimary(), "Ảnh thứ hai phải bị hạ xuống false");
        assertFalse(result.get(2).getIsPrimary(), "Ảnh thứ ba vẫn là false");
    }

    @Test
    @DisplayName("Kịch bản 2: Danh sách không có ảnh nào isPrimary = true -> tự động gán ảnh đầu tiên làm primary")
    void updateProductImages_noPrimaryProvided_defaultsFirstToPrimary() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));
        when(productImageRepository.findByProductId(1L)).thenReturn(Collections.emptyList());

        List<UpdateProductImageRequest> dtos = List.of(
                UpdateProductImageRequest.builder().imageUrl("/uploads/img1.jpg").isPrimary(false).build(),
                UpdateProductImageRequest.builder().imageUrl("/uploads/img2.jpg").isPrimary(false).build()
        );

        when(productImageRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productMapper.toProductImageDtoList(anyList())).thenAnswer(invocation -> {
            List<ProductImage> imgs = invocation.getArgument(0);
            return imgs.stream().map(i -> ProductImageDto.builder().imageUrl(i.getImageUrl()).isPrimary(i.getIsPrimary()).build()).toList();
        });

        List<ProductImageDto> result = productService.updateProductImages(1L, dtos);

        assertEquals(2, result.size());
        assertTrue(result.get(0).getIsPrimary(), "Ảnh đầu tiên phải được tự động kích hoạt isPrimary = true");
        assertFalse(result.get(1).getIsPrimary());
    }

    @Test
    @DisplayName("Kịch bản 3: Danh sách rỗng [] -> xóa toàn bộ ảnh cũ và trả về danh sách rỗng")
    void updateProductImages_emptyList_clearsOldImages() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));
        ProductImage oldImage = ProductImage.builder().id(99L).product(sampleProduct).imageUrl("/uploads/old.jpg").isPrimary(true).build();
        when(productImageRepository.findByProductId(1L)).thenReturn(List.of(oldImage));
        when(productMapper.toProductImageDtoList(Collections.emptyList())).thenReturn(Collections.emptyList());

        List<ProductImageDto> result = productService.updateProductImages(1L, Collections.emptyList());

        assertTrue(result.isEmpty());
        verify(productImageRepository, times(1)).deleteAllInBatch(List.of(oldImage));
        verify(productImageRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("Kịch bản 4: Phần tử có imageUrl rỗng hoặc chứa script độc hại javascript:... -> ném BusinessException 400")
    void updateProductImages_invalidUrl_throwsBusinessException() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));

        // URL null
        List<UpdateProductImageRequest> nullUrl = List.of(UpdateProductImageRequest.builder().imageUrl(null).build());
        BusinessException ex1 = assertThrows(BusinessException.class, () -> productService.updateProductImages(1L, nullUrl));
        assertEquals(HttpStatus.BAD_REQUEST, ex1.getStatus());

        // URL khoảng trắng
        List<UpdateProductImageRequest> blankUrl = List.of(UpdateProductImageRequest.builder().imageUrl("   ").build());
        BusinessException ex2 = assertThrows(BusinessException.class, () -> productService.updateProductImages(1L, blankUrl));
        assertEquals(HttpStatus.BAD_REQUEST, ex2.getStatus());

        // URL script độc hại
        List<UpdateProductImageRequest> scriptUrl = List.of(UpdateProductImageRequest.builder().imageUrl("javascript:alert(1)").build());
        BusinessException ex3 = assertThrows(BusinessException.class, () -> productService.updateProductImages(1L, scriptUrl));
        assertEquals(HttpStatus.BAD_REQUEST, ex3.getStatus());
    }

    @Test
    @DisplayName("Kịch bản 5: productId không tồn tại -> ném ResourceNotFoundException (404)")
    void updateProductImages_nonExistentProduct_throwsResourceNotFound() {
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.updateProductImages(999L, Collections.emptyList()));
        verifyNoInteractions(productImageRepository);
    }

    @Test
    @DisplayName("Kịch bản 6: Thay thế thành công bộ ảnh cũ bằng bộ ảnh mới nguyên tử")
    void updateProductImages_success_replacesAtomic() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));
        ProductImage oldImage = ProductImage.builder().id(99L).product(sampleProduct).imageUrl("/uploads/old.jpg").isPrimary(true).build();
        when(productImageRepository.findByProductId(1L)).thenReturn(List.of(oldImage));

        List<UpdateProductImageRequest> dtos = List.of(
                UpdateProductImageRequest.builder().imageUrl("https://example.com/macbook.png").isPrimary(true).build()
        );

        when(productImageRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productMapper.toProductImageDtoList(anyList())).thenAnswer(invocation -> {
            List<ProductImage> imgs = invocation.getArgument(0);
            return imgs.stream().map(i -> ProductImageDto.builder().imageUrl(i.getImageUrl()).isPrimary(i.getIsPrimary()).build()).toList();
        });

        List<ProductImageDto> result = productService.updateProductImages(1L, dtos);

        assertEquals(1, result.size());
        assertEquals("https://example.com/macbook.png", result.get(0).getImageUrl());
        verify(productImageRepository, times(1)).deleteAllInBatch(List.of(oldImage));
        verify(productImageRepository, times(1)).saveAll(anyList());
    }
}
