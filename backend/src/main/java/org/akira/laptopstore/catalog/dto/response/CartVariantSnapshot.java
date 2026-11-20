package org.akira.laptopstore.catalog.dto.response;

import lombok.AllArgsConstructor;
import lombok.Value;
import java.math.BigDecimal;

/** Catalog data for cart display and validation, without exposing persistence entities. */
@Value
@AllArgsConstructor
public class CartVariantSnapshot {
    Long variantId;
    Long productId;
    String productName;
    String variantName;
    String sku;
    String thumbnailImage;
    BigDecimal unitPrice;
    Integer quantity;
    boolean sellable;

    public CartVariantSnapshot(
            Long variantId,
            String productName,
            String variantName,
            String sku,
            BigDecimal unitPrice,
            Integer quantity,
            boolean sellable
    ) {
        this(variantId, null, productName, variantName, sku, null, unitPrice, quantity, sellable);
    }
}
