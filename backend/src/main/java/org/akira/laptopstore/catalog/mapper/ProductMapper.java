package org.akira.laptopstore.catalog.mapper;

import org.akira.laptopstore.catalog.dto.response.ProductImageDto;
import org.akira.laptopstore.catalog.dto.response.ProductResponse;
import org.akira.laptopstore.catalog.dto.response.ProductSpecificationDto;
import org.akira.laptopstore.catalog.dto.response.VariantSnapshot;
import org.akira.laptopstore.catalog.entity.Product;
import org.akira.laptopstore.catalog.entity.ProductImage;
import org.akira.laptopstore.catalog.entity.ProductSpecification;
import org.akira.laptopstore.catalog.entity.ProductVariant;
import org.akira.laptopstore.catalog.dto.response.ProductSummaryResponse;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Mapper(componentModel = "spring")
public interface ProductMapper {

    @Mapping(source = "brand.name", target = "brandName")
    @Mapping(source = "category.name", target = "categoryName")
    @Mapping(target = "thumbnailImage", expression = "java(this.getThumbnail(product))")
    @Mapping(target = "startingPrice", expression = "java(this.getStartingPrice(product))")
    @Mapping(source = "specification.cpu", target = "cpu")
    @Mapping(source = "specification.screenSize", target = "screenSize")
    @Mapping(target = "availableConfiguration", expression = "java(this.getAvailableConfiguration(product))")
    ProductSummaryResponse toProductSummaryResponse(Product product);

    // THÊM ĐOẠN NÀY VÀO ĐỂ FIX LỖI Ở CONTROLLER
    @Mapping(source = "brand.name", target = "brandName")
    @Mapping(source = "category.name", target = "categoryName")
    ProductResponse toResponse(Product product);

    List<ProductResponse> toProductResponseList(List<Product> products);

    ProductImageDto toProductImageDto(ProductImage image);
    List<ProductImageDto> toProductImageDtoList(List<ProductImage> images);
    ProductSpecificationDto toProductSpecificationDto(ProductSpecification spec);
    VariantSnapshot toVariantSnapshot(ProductVariant variant);

    default String getThumbnail(Product product) {
        if (product == null || product.getImages() == null || product.getImages().isEmpty()) {
            return null;
        }

        return product.getImages().stream()
                .filter(java.util.Objects::nonNull)
                .filter(image -> Boolean.TRUE.equals(image.getIsPrimary()))
                .map(image -> image.getImageUrl())
                .findFirst()
                .orElseGet(() -> product.getImages().stream()
                        .filter(java.util.Objects::nonNull)
                        .map(image -> image.getImageUrl())
                        .findFirst()
                        .orElse(null));
    }

    default BigDecimal getStartingPrice(Product product) {
        if (product == null || product.getVariants() == null || product.getVariants().isEmpty()) {
            return null;
        }

        return product.getVariants().stream()
                .filter(java.util.Objects::nonNull)
                .map(variant -> variant.getPrice()) // Entity ProductVariant bắt buộc phải có getPrice()
                .filter(java.util.Objects::nonNull)
                .min(java.util.Comparator.naturalOrder())
                .orElse(null);
    }

    default ProductSummaryResponse.AvailableConfiguration getAvailableConfiguration(Product product) {
        if (product == null || !product.isActive() || !"ACTIVE".equalsIgnoreCase(product.getStatus()) || product.getVariants() == null) {
            return null;
        }

        return product.getVariants().stream()
                .filter(Objects::nonNull)
                .filter(variant -> variant.isActive() && "ACTIVE".equalsIgnoreCase(variant.getStatus()))
                .filter(variant -> variant.getQuantity() != null && variant.getQuantity() > 0 && variant.getPrice() != null)
                .min(Comparator.comparing(ProductVariant::getPrice).thenComparing(ProductVariant::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(variant -> new ProductSummaryResponse.AvailableConfiguration(variant.getRam(), variant.getStorage(), variant.getPrice()))
                .orElse(null);
    }
}
