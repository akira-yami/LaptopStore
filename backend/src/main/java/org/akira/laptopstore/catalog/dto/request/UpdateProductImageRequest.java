package org.akira.laptopstore.catalog.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO yêu cầu cập nhật thông tin hình ảnh sản phẩm.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProductImageRequest {

    @NotBlank(message = "Đường dẫn ảnh không được để trống")
    private String imageUrl;

    private Boolean isPrimary;
}
