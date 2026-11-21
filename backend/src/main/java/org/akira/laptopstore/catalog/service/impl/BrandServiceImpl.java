package org.akira.laptopstore.catalog.service.impl;

import lombok.RequiredArgsConstructor;

import org.akira.laptopstore.catalog.dto.request.CreateBrandRequest;
import org.akira.laptopstore.catalog.dto.request.UpdateBrandRequest;
import org.akira.laptopstore.catalog.dto.response.BrandResponse;
import org.akira.laptopstore.catalog.entity.Brand;
import org.akira.laptopstore.catalog.repository.BrandRepository;
import org.akira.laptopstore.catalog.service.BrandService;
import org.akira.laptopstore.catalog.mapper.BrandMapper;

import org.akira.laptopstore.exception.BusinessException;
import org.akira.laptopstore.exception.ResourceNotFoundException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BrandServiceImpl implements BrandService {

    private final BrandRepository brandRepository;
    private final BrandMapper brandMapper;

    @Override
    public List<BrandResponse> findAllBrands() {
        // Lấy danh sách từ DB (chỉ active = true nhờ @SQLRestriction)
        return brandRepository.findAll()
                .stream()
                .map(brandMapper::toResponse)
                .toList();
    }

    @Override
    public List<BrandResponse> findAllBrandsForAdmin() {
        // Lấy toàn bộ thương hiệu (kể cả active = false / tạm ẩn) cho Admin/Staff
        return brandRepository.findAllIncludeInactive()
                .stream()
                .map(brandMapper::toResponse)
                .toList();
    }

    @Override
    public BrandResponse findBrandById(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thương hiệu với ID: " + id));
        
        return brandMapper.toResponse(brand);
    }
    
    @Override
    @Transactional
    public BrandResponse createBrand(CreateBrandRequest request) {
        // 1. Chốt chặn: Kiểm tra tên Brand đã tồn tại chưa (dùng native query để quét cả bản ghi ẩn)
        if (brandRepository.existsByNameNative(request.getName().trim())) {
            throw new BusinessException(
                org.springframework.http.HttpStatus.BAD_REQUEST, 
                "BRAND_NAME_ALREADY_EXISTS", 
                "Tên thương hiệu '" + request.getName() + "' đã tồn tại!"
            );
        }

        // 2. Map dữ liệu và lưu
        Brand brand = Brand.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .active(true)
                .build();

        Brand savedBrand = brandRepository.save(brand);
        return brandMapper.toResponse(savedBrand); 
    }

    @Override
    @Transactional
    public BrandResponse updateBrand(Long id, UpdateBrandRequest request) {
        // 1. Tìm Brand cần update (hỗ trợ cả brand đang tạm ẩn)
        Brand existingBrand = brandRepository.findByIdNative(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thương hiệu với ID: " + id));

        // 2. Chốt chặn: Nếu tên bị đổi, kiểm tra xem có trùng với hãng KHÁC không
        if (!existingBrand.getName().equalsIgnoreCase(request.getName().trim())) {
            if (brandRepository.existsByNameAndIdNotNative(request.getName().trim(), id)) {
                throw new BusinessException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, 
                    "BRAND_NAME_ALREADY_EXISTS", 
                    "Tên thương hiệu '" + request.getName() + "' đã bị trùng với hãng khác!"
                );
            }
        }

        existingBrand.setName(request.getName().trim());
        existingBrand.setDescription(request.getDescription());

        Brand updatedBrand = brandRepository.save(existingBrand);
        return brandMapper.toResponse(updatedBrand);
    }

    @Override
    @Transactional
    public void updateBrandStatus(Long id, boolean active) {
        int updated = brandRepository.updateActiveStatus(id, active);
        if (updated == 0) {
            throw new ResourceNotFoundException("Không tìm thấy thương hiệu với ID: " + id);
        }
    }

    @Override
    @Transactional
    public void deleteBrand(Long id) {
        // 1. Kiểm tra tồn tại
        Brand existingBrand = brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thương hiệu với ID: " + id));

        // 2. Xóa!
        // Nhờ phép thuật của @SQLDelete trong Entity, lệnh này sẽ tự động chuyển thành UPDATE active = false!
        brandRepository.delete(existingBrand);
    }
}