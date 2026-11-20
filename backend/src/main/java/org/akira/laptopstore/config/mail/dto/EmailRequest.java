package org.akira.laptopstore.config.mail.dto;

/*
 * =========================================================================
 * [MÔ TẢ NGHIỆP VỤ & LỢI ÍCH KIẾN TRÚC - EmailRequest]:
 * - Tại sao tạo DTO này:
 *   + Chuẩn hóa cấu trúc dữ liệu yêu cầu gửi email (người nhận, tiêu đề, nội dung,
 *     cờ định dạng HTML) làm hợp đồng thống nhất cho mọi module trong toàn hệ thống.
 * - Giữ theo cách cũ (truyền nhiều tham số rời rạc hoặc dùng trực tiếp MimeMessage):
 *   + Khi cần mở rộng thêm các trường như CC, BCC, danh sách file đính kèm (attachments),
 *     tất cả các phương thức gọi sẽ bị phá vỡ chữ ký hàm (breaking change).
 * - Xử lý theo cách mới được lợi gì:
 *   + Áp dụng Builder Pattern (@Builder) giúp tạo đối tượng linh hoạt, rõ ràng.
 *   + Đóng gói đầy đủ validation, an toàn type-safe và dễ dàng tuần tự hóa/giải tuần tự hóa JSON.
 * =========================================================================
 */

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailRequest {

    /**
     * Địa chỉ email người nhận. Nếu để null hoặc rỗng, hệ thống sẽ tự động fallback về:
     * stevenndln@gmail.com
     */
    private String to;

    /**
     * Tiêu đề của email (Subject).
     */
    @NotBlank(message = "Tiêu đề email không được để trống")
    private String subject;

    /**
     * Nội dung thư (nội dung text thuần hoặc mã HTML).
     */
    @NotBlank(message = "Nội dung email không được để trống")
    private String content;

    /**
     * Cờ xác định định dạng: true nếu là HTML markup, false nếu là Plain text.
     */
    @Builder.Default
    private boolean isHtml = false;
}
