package org.akira.laptopstore.catalog.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VariantSnapshot {
    private Long id;
    private String sku, ram, storage, color, status;
    private BigDecimal price;
    private Integer quantity;
    private Boolean active;
}
