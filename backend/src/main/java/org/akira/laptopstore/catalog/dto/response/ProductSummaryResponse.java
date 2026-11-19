package org.akira.laptopstore.catalog.dto.response;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ProductSummaryResponse {
    private Long id;
    private String name, brandName, categoryName, status, thumbnailImage;
    private boolean active;
    private BigDecimal startingPrice;
    private String cpu, screenSize;
    private AvailableConfiguration availableConfiguration;

    public record AvailableConfiguration(String ram, String storage, BigDecimal price) {}
}
