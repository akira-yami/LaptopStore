package org.akira.laptopstore.catalog.service.impl;

import lombok.RequiredArgsConstructor;
import org.akira.laptopstore.catalog.dto.response.CartVariantSnapshot;
import org.akira.laptopstore.catalog.entity.ProductImage;
import org.akira.laptopstore.catalog.entity.ProductVariant;
import org.akira.laptopstore.catalog.repository.ProductImageRepository;
import org.akira.laptopstore.catalog.repository.ProductVariantRepository;
import org.akira.laptopstore.catalog.service.CatalogCartQueryService;
import org.akira.laptopstore.common.util.VariantUtils;
import org.akira.laptopstore.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogCartQueryServiceImpl implements CatalogCartQueryService {
    private final ProductVariantRepository variants;
    private final ProductImageRepository productImages;

    @Override
    public CartVariantSnapshot getVariant(Long variantId) {
        ProductVariant variant = variants.findById(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("Product variant not found: " + variantId));
        if (variant.getProduct() == null) {
            throw new ResourceNotFoundException("Product variant not found: " + variant.getId());
        }
        Map<Long, String> thumbnails = resolveThumbnailsByProductId(Set.of(variant.getProduct().getId()));
        return toSnapshot(variant, thumbnails.get(variant.getProduct().getId()));
    }

    @Override
    public List<CartVariantSnapshot> getVariants(Collection<Long> variantIds) {
        if (variantIds == null || variantIds.isEmpty()) {
            return List.of();
        }
        List<ProductVariant> found = variants.findAllById(variantIds);
        Set<Long> productIds = found.stream()
                .map(ProductVariant::getProduct)
                .filter(Objects::nonNull)
                .map(product -> product.getId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        // Lấy ảnh đại diện hàng loạt trong 1 query duy nhất (chống N+1 cả ở backend lẫn frontend)
        Map<Long, String> thumbnails = resolveThumbnailsByProductId(productIds);
        return found.stream()
                .map(v -> toSnapshot(v, v.getProduct() != null ? thumbnails.get(v.getProduct().getId()) : null))
                .toList();
    }

    private Map<Long, String> resolveThumbnailsByProductId(Set<Long> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> primaryByProduct = new HashMap<>();
        Map<Long, String> fallbackByProduct = new HashMap<>();
        for (ProductImage img : productImages.findByProductIdIn(productIds)) {
            if (img.getProduct() == null || img.getProduct().getId() == null || img.getImageUrl() == null) {
                continue;
            }
            Long pid = img.getProduct().getId();
            if (Boolean.TRUE.equals(img.getIsPrimary())) {
                primaryByProduct.putIfAbsent(pid, img.getImageUrl());
            } else {
                fallbackByProduct.putIfAbsent(pid, img.getImageUrl());
            }
        }
        Map<Long, String> resolved = new HashMap<>(fallbackByProduct);
        resolved.putAll(primaryByProduct);
        return resolved;
    }

    private CartVariantSnapshot toSnapshot(ProductVariant variant, String thumbnailImage) {
        if (variant.getProduct() == null) {
            throw new ResourceNotFoundException("Product variant not found: " + variant.getId());
        }
        Long productId = variant.getProduct().getId();
        String productName = variant.getProduct().getName();
        boolean sellable = "ACTIVE".equalsIgnoreCase(variant.getStatus())
                && "ACTIVE".equalsIgnoreCase(variant.getProduct().getStatus());
        return new CartVariantSnapshot(
                variant.getId(),
                productId,
                productName,
                VariantUtils.formatFullProductName(productName, variant.getRam(), variant.getStorage(), variant.getColor()),
                variant.getSku(),
                thumbnailImage,
                variant.getPrice(),
                variant.getQuantity(),
                sellable
        );
    }
}
