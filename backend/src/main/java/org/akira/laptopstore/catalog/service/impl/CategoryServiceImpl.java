package org.akira.laptopstore.catalog.service.impl;

import lombok.RequiredArgsConstructor;

import org.akira.laptopstore.catalog.dto.request.CreateCategoryRequest;
import org.akira.laptopstore.catalog.dto.request.UpdateCategoryRequest;
import org.akira.laptopstore.catalog.dto.response.CategoryResponse;
import org.akira.laptopstore.catalog.entity.Category;
import org.akira.laptopstore.catalog.repository.CategoryRepository;
import org.akira.laptopstore.catalog.service.CategoryService;
import org.akira.laptopstore.catalog.mapper.CategoryMapper;

import org.akira.laptopstore.exception.BusinessException;
import org.akira.laptopstore.exception.ResourceNotFoundException;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    // Anh dùng @RequiredArgsConstructor của Lombok kết hợp với từ khóa 'final'
    // để Spring tự động Inject (tiêm) CategoryRepository vào đây mà không cần viết hàm Constructor dài dòng.
    private final CategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;

    @Override
    public List<CategoryResponse> findAllCategories() {
        return categoryRepository.findAll()
                .stream()
                .map(categoryMapper::toResponse)
                .toList();
    }

    @Override
    public List<CategoryResponse> findAllCategoriesForAdmin() {
        return categoryRepository.findAllIncludeInactive()
                .stream()
                .map(categoryMapper::toResponse)
                .toList();
    }

    @Override
    public CategoryResponse findCategoryById(Long id) {
        Category category = categoryRepository.findByIdNative(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));
        return categoryMapper.toResponse(category);
    }

    @Override
    @Transactional
    public CategoryResponse createCategory(CreateCategoryRequest request) {
        // Chốt chặn 1: Tên danh mục không được trùng (quét cả danh mục tạm ẩn)
        if (categoryRepository.existsByNameNative(request.getName().trim())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "CATEGORY_NAME_EXISTS", 
                    "Tên danh mục '" + request.getName() + "' đã tồn tại!");
        }

        Category category = Category.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .active(true)
                .build();

        return categoryMapper.toResponse(categoryRepository.save(category));
    }

    @Override
    @Transactional
    public CategoryResponse updateCategory(Long id, UpdateCategoryRequest request) {
        Category category = categoryRepository.findByIdNative(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));

        // Chốt chặn 2: Tránh update tên đè lên danh mục khác
        if (!category.getName().equalsIgnoreCase(request.getName().trim())) {
            if (categoryRepository.existsByNameAndIdNotNative(request.getName().trim(), id)) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "CATEGORY_NAME_EXISTS", 
                        "Tên danh mục '" + request.getName() + "' đã bị trùng với danh mục khác!");
            }
        }

        category.setName(request.getName().trim());
        category.setDescription(request.getDescription());

        return categoryMapper.toResponse(categoryRepository.save(category));
    }

    @Override
    @Transactional
    public void updateCategoryStatus(Long id, boolean active) {
        int updated = categoryRepository.updateActiveStatus(id, active);
        if (updated == 0) {
            throw new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id);
        }
    }

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));

        // Gọi lệnh delete nhưng thực chất Hibernate sẽ chạy câu UPDATE active = false
        categoryRepository.delete(category);
    }

}