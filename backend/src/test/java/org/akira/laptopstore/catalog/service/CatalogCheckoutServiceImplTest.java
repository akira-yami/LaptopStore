package org.akira.laptopstore.catalog.service;

import org.akira.laptopstore.catalog.dto.response.CheckoutVariantSnapshot;
import org.akira.laptopstore.catalog.dto.response.StockChangeResult;
import org.akira.laptopstore.catalog.entity.Product;
import org.akira.laptopstore.catalog.entity.ProductVariant;
import org.akira.laptopstore.catalog.repository.ProductVariantRepository;
import org.akira.laptopstore.catalog.service.impl.CatalogCheckoutServiceImpl;
import org.akira.laptopstore.exception.BusinessException;
import org.akira.laptopstore.exception.ResourceNotFoundException;
import org.akira.laptopstore.exception.ValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CatalogCheckoutServiceImplTest {

    @Mock
    private ProductVariantRepository productVariantRepository;

    private CatalogCheckoutServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CatalogCheckoutServiceImpl(productVariantRepository);
    }

    @Test
    void lockAndGetSellableVariantsOrdersIdsAscendingAndMapsSnapshots() {
        ProductVariant v2 = activeVariant(2L, 10L, "ThinkPad X1", "TP-X1", new BigDecimal("30000000"), 8);
        ProductVariant v5 = activeVariant(5L, 20L, "MacBook Pro", "MBP-14", new BigDecimal("45000000"), 4);

        when(productVariantRepository.findAllByIdInForUpdate(List.of(2L, 5L)))
                .thenReturn(List.of(v2, v5));

        List<CheckoutVariantSnapshot> result = service.lockAndGetSellableVariants(List.of(5L, 2L, 5L));

        assertEquals(2, result.size());
        assertEquals(2L, result.get(0).getVariantId());
        assertEquals(8, result.get(0).getAvailableQuantity());
        assertEquals(5L, result.get(1).getVariantId());
        assertEquals("MBP-14", result.get(1).getSku());
        verify(productVariantRepository).findAllByIdInForUpdate(List.of(2L, 5L));
    }

    @Test
    void lockAndGetSellableVariantsRejectsInvalidOrMissingVariants() {
        assertThrows(ValidationException.class, () -> service.lockAndGetSellableVariants(List.of()));
        assertThrows(ValidationException.class, () -> service.lockAndGetSellableVariants(List.of(0L)));

        when(productVariantRepository.findAllByIdInForUpdate(List.of(1L, 2L)))
                .thenReturn(List.of(activeVariant(1L, 10L, "Laptop A", "LA-1", new BigDecimal("15000000"), 3)));

        assertThrows(ResourceNotFoundException.class, () -> service.lockAndGetSellableVariants(List.of(1L, 2L)));
    }

    @Test
    void lockAndGetSellableVariantsRejectsInactiveVariantOrProduct() {
        ProductVariant inactiveVariant = activeVariant(3L, 10L, "Laptop B", "LB-3", new BigDecimal("18000000"), 5);
        inactiveVariant.setStatus("INACTIVE");
        when(productVariantRepository.findAllByIdInForUpdate(List.of(3L))).thenReturn(List.of(inactiveVariant));

        assertThrows(ValidationException.class, () -> service.lockAndGetSellableVariants(List.of(3L)));

        ProductVariant inactiveProduct = activeVariant(4L, 11L, "Laptop C", "LC-4", new BigDecimal("20000000"), 5);
        inactiveProduct.getProduct().setStatus("INACTIVE");
        when(productVariantRepository.findAllByIdInForUpdate(List.of(4L))).thenReturn(List.of(inactiveProduct));

        assertThrows(ValidationException.class, () -> service.lockAndGetSellableVariants(List.of(4L)));
    }

    @Test
    void deductStockLocksVariantDecrementsQuantityAndReturnsBeforeAfter() {
        ProductVariant variant = activeVariant(7L, 10L, "XPS 13", "XPS-13", new BigDecimal("35000000"), 10);
        when(productVariantRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(variant));

        StockChangeResult result = service.deductStock(7L, 3);

        assertEquals(7L, result.getVariantId());
        assertEquals(10, result.getQuantityBefore());
        assertEquals(7, result.getQuantityAfter());
        assertEquals(7, variant.getQuantity());
        verify(productVariantRepository).save(variant);
    }

    @Test
    void deductStockThrowsWhenInsufficientOrInvalidInput() {
        assertThrows(ValidationException.class, () -> service.deductStock(0L, 1));
        assertThrows(ValidationException.class, () -> service.deductStock(7L, 0));

        ProductVariant variant = activeVariant(7L, 10L, "XPS 13", "XPS-13", new BigDecimal("35000000"), 2);
        when(productVariantRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(variant));

        assertThrows(ValidationException.class, () -> service.deductStock(7L, 3));
        verify(productVariantRepository, never()).save(any());
    }

    @Test
    void adjustStockSupportsPositiveAndNegativeDeltaAndBlocksNegativeResult() {
        ProductVariant variant = activeVariant(8L, 10L, "ROG Strix", "ROG-16", new BigDecimal("42000000"), 5);
        when(productVariantRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(variant));

        StockChangeResult restocked = service.adjustStock(8L, 4);
        assertEquals(5, restocked.getQuantityBefore());
        assertEquals(9, restocked.getQuantityAfter());

        BusinessException outOfStock = assertThrows(BusinessException.class, () -> service.adjustStock(8L, -10));
        assertEquals(HttpStatus.BAD_REQUEST, outOfStock.getStatus());
        assertEquals("OUT_OF_STOCK", outOfStock.getCode());
    }

    private ProductVariant activeVariant(Long id, Long productId, String productName, String sku, BigDecimal price, int qty) {
        Product product = new Product();
        product.setId(productId);
        product.setName(productName);
        product.setStatus("ACTIVE");

        ProductVariant variant = new ProductVariant();
        variant.setId(id);
        variant.setProduct(product);
        variant.setRam("16GB");
        variant.setStorage("512GB");
        variant.setColor("Silver");
        variant.setSku(sku);
        variant.setPrice(price);
        variant.setQuantity(qty);
        variant.setStatus("ACTIVE");
        return variant;
    }
}
