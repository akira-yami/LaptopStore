package org.akira.laptopstore.catalog.service.impl;

import org.akira.laptopstore.catalog.dto.response.BrandResponse;
import org.akira.laptopstore.catalog.dto.response.CategoryResponse;
import org.akira.laptopstore.catalog.entity.Brand;
import org.akira.laptopstore.catalog.entity.Category;
import org.akira.laptopstore.catalog.mapper.BrandMapper;
import org.akira.laptopstore.catalog.mapper.CategoryMapper;
import org.akira.laptopstore.catalog.repository.BrandRepository;
import org.akira.laptopstore.catalog.repository.CategoryRepository;
import org.akira.laptopstore.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BrandAndCategoryServiceImplTest {

    @Mock
    private BrandRepository brandRepository;

    @Mock
    private BrandMapper brandMapper;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private CategoryMapper categoryMapper;

    private BrandServiceImpl brandService;
    private CategoryServiceImpl categoryService;

    @BeforeEach
    void setUp() {
        brandService = new BrandServiceImpl(brandRepository, brandMapper);
        categoryService = new CategoryServiceImpl(categoryRepository, categoryMapper);
    }

    @Test
    @DisplayName("Public findBrandById chỉ dùng findById (@SQLRestriction active=true), không lộ brand đã tạm ẩn")
    void findBrandById_usesActiveRestrictedFindById() {
        Brand activeBrand = Brand.builder().id(1L).name("Apple").active(true).build();
        when(brandRepository.findById(1L)).thenReturn(Optional.of(activeBrand));
        when(brandMapper.toResponse(activeBrand))
                .thenReturn(BrandResponse.builder().id(1L).name("Apple").active(true).build());

        BrandResponse response = brandService.findBrandById(1L);

        assertEquals("Apple", response.getName());
        verify(brandRepository).findById(1L);
        verify(brandRepository, never()).findByIdNative(anyLong());
    }

    @Test
    @DisplayName("Public findBrandById trả 404 khi brand không tồn tại hoặc đã tạm ẩn")
    void findBrandById_hiddenOrMissing_throwsNotFound() {
        when(brandRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> brandService.findBrandById(2L));
        verify(brandRepository).findById(2L);
        verify(brandRepository, never()).findByIdNative(anyLong());
    }

    @Test
    @DisplayName("Public findCategoryById chỉ dùng findById (@SQLRestriction active=true), không lộ category đã tạm ẩn")
    void findCategoryById_usesActiveRestrictedFindById() {
        Category activeCategory = Category.builder().id(1L).name("Gaming").active(true).build();
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(activeCategory));
        when(categoryMapper.toResponse(activeCategory))
                .thenReturn(CategoryResponse.builder().id(1L).name("Gaming").active(true).build());

        CategoryResponse response = categoryService.findCategoryById(1L);

        assertEquals("Gaming", response.getName());
        verify(categoryRepository).findById(1L);
        verify(categoryRepository, never()).findByIdNative(anyLong());
    }

    @Test
    @DisplayName("Public findCategoryById trả 404 khi category không tồn tại hoặc đã tạm ẩn")
    void findCategoryById_hiddenOrMissing_throwsNotFound() {
        when(categoryRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> categoryService.findCategoryById(2L));
        verify(categoryRepository).findById(2L);
        verify(categoryRepository, never()).findByIdNative(anyLong());
    }

    @Test
    @DisplayName("Admin findAllBrandsForAdmin và updateBrandStatus hoạt động đúng")
    void adminBrandOperations_workAsExpected() {
        Brand hidden = Brand.builder().id(2L).name("Acer").active(false).build();
        when(brandRepository.findAllIncludeInactive()).thenReturn(List.of(hidden));
        when(brandMapper.toResponse(hidden))
                .thenReturn(BrandResponse.builder().id(2L).name("Acer").active(false).build());
        when(brandRepository.updateActiveStatus(2L, true)).thenReturn(1);
        when(brandRepository.updateActiveStatus(999L, true)).thenReturn(0);

        List<BrandResponse> brands = brandService.findAllBrandsForAdmin();
        assertEquals(1, brands.size());
        assertEquals(false, brands.get(0).isActive());

        brandService.updateBrandStatus(2L, true);
        verify(brandRepository).updateActiveStatus(2L, true);
        assertThrows(ResourceNotFoundException.class, () -> brandService.updateBrandStatus(999L, true));
    }

    @Test
    @DisplayName("Admin findAllCategoriesForAdmin và updateCategoryStatus hoạt động đúng")
    void adminCategoryOperations_workAsExpected() {
        Category hidden = Category.builder().id(3L).name("Workstation").active(false).build();
        when(categoryRepository.findAllIncludeInactive()).thenReturn(List.of(hidden));
        when(categoryMapper.toResponse(hidden))
                .thenReturn(CategoryResponse.builder().id(3L).name("Workstation").active(false).build());
        when(categoryRepository.updateActiveStatus(3L, true)).thenReturn(1);
        when(categoryRepository.updateActiveStatus(999L, true)).thenReturn(0);

        List<CategoryResponse> categories = categoryService.findAllCategoriesForAdmin();
        assertEquals(1, categories.size());
        assertEquals(false, categories.get(0).isActive());

        categoryService.updateCategoryStatus(3L, true);
        verify(categoryRepository).updateActiveStatus(3L, true);
        assertThrows(ResourceNotFoundException.class, () -> categoryService.updateCategoryStatus(999L, true));
    }
}
