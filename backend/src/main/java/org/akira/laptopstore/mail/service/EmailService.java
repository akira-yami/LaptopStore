package org.akira.laptopstore.mail.service;

import org.akira.laptopstore.mail.dto.EmailRequest;

/**
 * Interface cung cấp dịch vụ gửi email qua giao thức SMTP.
 * Đóng vai trò lớp trừu tượng hạ tầng (Infrastructure abstraction) độc lập với thư viện bên thứ ba.
 */
public interface EmailService {

    /**
     * Gửi email theo thông tin đóng gói trong EmailRequest.
     *
     * @param request Thông tin yêu cầu gửi email (to, subject, content, isHtml).
     * @return true nếu gửi thành công qua SMTP; false nếu xảy ra sự cố kết nối.
     */
    boolean sendEmail(EmailRequest request);

    /**
     * Phương thức tiện ích gửi email văn bản thuần túy (Plain Text).
     *
     * @param to Địa chỉ người nhận (nếu null/rỗng sẽ fallback về địa chỉ mặc định).
     * @param subject Tiêu đề thư.
     * @param content Nội dung văn bản.
     * @return true nếu thành công; false nếu thất bại.
     */
    boolean sendSimpleEmail(String to, String subject, String content);

    /**
     * Phương thức tiện ích gửi email định dạng HTML.
     *
     * @param to Địa chỉ người nhận (nếu null/rỗng sẽ fallback về địa chỉ mặc định).
     * @param subject Tiêu đề thư.
     * @param htmlContent Nội dung mã HTML.
     * @return true nếu thành công; false nếu thất bại.
     */
    boolean sendHtmlEmail(String to, String subject, String htmlContent);
}
