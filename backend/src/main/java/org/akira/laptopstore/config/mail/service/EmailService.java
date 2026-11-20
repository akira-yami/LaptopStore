package org.akira.laptopstore.config.mail.service;

/*
 * =========================================================================
 * [MÔ TẢ GIAO DIỆN HỢP ĐỒNG - EmailService]:
 * - Tại sao tạo interface này:
 *   + Tuân thủ nguyên lý Dependency Inversion (chữ D trong SOLID) và thiết kế Module Architecture:
 *     Các module nghiệp vụ (Order, Auth, Review...) chỉ phụ thuộc vào abstraction `EmailService`
 *     mà không bị trói buộc với chi tiết triển khai cụ thể (như Spring JavaMailSender hay AWS SES/SendGrid).
 * - Giữ theo cách cũ (gọi trực tiếp JavaMailSender ở khắp nơi):
 *   + Khó khăn khi viết Unit Test (phải mock sâu vào thư viện bên thứ ba), vi phạm ranh giới mô-đun.
 * - Xử lý theo cách mới được lợi gì:
 *   + Dễ dàng hoán đổi sang dịch vụ email khác hoặc tạo Mock/Stub trong môi trường test/staging.
 *   + Cung cấp các phương thức tiện ích cho cả email đồng bộ lẫn bất đồng bộ.
 * =========================================================================
 */

import org.akira.laptopstore.config.mail.dto.EmailRequest;

public interface EmailService {

    /**
     * Gửi một bức thư điện tử dựa trên thông tin đóng gói trong EmailRequest.
     *
     * @param request Chứa người nhận, tiêu đề, nội dung và cờ isHtml.
     * @return true nếu gửi thành công, false nếu có lỗi xảy ra.
     */
    boolean sendEmail(EmailRequest request);

    /**
     * Phương thức tiện ích gửi email văn bản nhanh.
     *
     * @param to Người nhận (fallback về stevenndln@gmail.com nếu null)
     * @param subject Tiêu đề
     * @param content Nội dung text
     * @return true nếu thành công
     */
    boolean sendSimpleEmail(String to, String subject, String content);

    /**
     * Phương thức tiện ích gửi email HTML nhanh.
     *
     * @param to Người nhận (fallback về stevenndln@gmail.com nếu null)
     * @param subject Tiêu đề
     * @param htmlContent Nội dung HTML
     * @return true nếu thành công
     */
    boolean sendHtmlEmail(String to, String subject, String htmlContent);
}
