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

@RestController
@RequestMapping("/api/v1/admin/brands")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
public class AdminBrandController {

    private final BrandService brandService;

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

