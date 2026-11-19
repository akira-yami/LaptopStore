package org.akira.laptopstore.order.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderDashboardSummaryResponse {
    private long totalOrders;
    private long pendingCount;
    private long inProgressCount;
    private long deliveredCount;
    private BigDecimal deliveredRevenue;
}
