package org.akira.laptopstore.payment.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewRefundRequest(
        @NotNull Boolean approved,
        Boolean returnOrder,
        @Size(max = 1000) String note
) {}
