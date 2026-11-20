package org.akira.laptopstore.cart.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddCartItemRequest {
    @NotNull(message = "productVariantId is required")
    @Positive(message = "productVariantId must be greater than 0")
    private Long productVariantId;

    @NotNull(message = "quantity is required")
    @Positive(message = "quantity must be greater than 0")
    @Max(value = 999, message = "quantity must not exceed 999")
    private Integer quantity;
}
