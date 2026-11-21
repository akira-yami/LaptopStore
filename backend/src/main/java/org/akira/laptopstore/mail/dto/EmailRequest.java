package org.akira.laptopstore.mail.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO đóng gói yêu cầu gửi email trong hệ thống LaptopStore.
 * Hỗ trợ deserialize chính xác JSON key "isHtml" thông qua Jackson @JsonProperty.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailRequest {

    /**
     * Địa chỉ email người nhận. Nếu để trống/null, hệ thống sẽ fallback về email cấu hình mặc định.
     */
    @Email(message = "Địa chỉ email người nhận không hợp lệ")
    private String to;

    @NotBlank(message = "Tiêu đề email không được để trống")
    private String subject;

    @NotBlank(message = "Nội dung email không được để trống")
    private String content;

    @JsonProperty("isHtml")
    @Builder.Default
    private boolean isHtml = false;
}
