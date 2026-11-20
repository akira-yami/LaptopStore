package org.akira.laptopstore.config.mail.controller;

/*
 * =========================================================================
 * [API KIỂM THỬ KẾT NỐI VÀ GỬI EMAIL - AdminEmailController]:
 * - Tại sao tạo controller này:
 *   + Cung cấp endpoint bảo vệ cho Quản trị viên (ADMIN) và Nhân viên (STAFF)
 *     chủ động kiểm tra kết nối SMTP server Gmail, gửi thử email kích hoạt hoặc thông báo.
 * - Giữ theo cách cũ (không có endpoint kiểm tra):
 *   + Khi triển khai hệ thống lên máy chủ staging/production, Dev/Ops không thể kiểm chứng
 *     tài khoản mật khẩu ứng dụng Gmail (APP PASSWORD) đã hợp lệ hay chưa mà phải chờ
 *     phát sinh đơn hàng thật hoặc lỗi log.
 * - Xử lý theo cách mới được lợi gì:
 *   + Hỗ trợ gửi email thử nghiệm ngay lập tức tới địa chỉ chỉ định hoặc mặc định `stevenndln@gmail.com`.
 *   + Trả về kết quả JSON chi tiết: trạng thái HTTP 200 kèm cờ success và thông báo phản hồi.
 * =========================================================================
 */

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.akira.laptopstore.config.mail.dto.EmailRequest;
import org.akira.laptopstore.config.mail.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/emails")
@RequiredArgsConstructor
public class AdminEmailController {

    private final EmailService emailService;

    /**
     * Endpoint gửi email thử nghiệm.
     * Quyền truy cập: ADMIN hoặc STAFF (để kiểm tra tích hợp).
     */
    @PostMapping("/send-test")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<Map<String, Object>> sendTestEmail(@Valid @RequestBody(required = false) EmailRequest request) {
        if (request == null) {
            request = EmailRequest.builder()
                    .to("stevenndln@gmail.com")
                    .subject("[LaptopStore] Thử nghiệm hệ thống Spring Boot Starter Mail")
                    .content("<h1>Xin chào!</h1><p>Hệ thống gửi email tự động của LaptopStore đã được tích hợp thành công.</p><p>Email gửi và nhận: <b>stevenndln@gmail.com</b></p>")
                    .isHtml(true)
                    .build();
        }

        boolean sent = emailService.sendEmail(request);

        if (sent) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Gửi email thử nghiệm thành công tới: " + (request.getTo() != null ? request.getTo() : "stevenndln@gmail.com"),
                    "recipient", request.getTo() != null ? request.getTo() : "stevenndln@gmail.com",
                    "subject", request.getSubject()
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Không thể gửi email. Vui lòng kiểm tra lại cấu hình SMTP hoặc mật khẩu ứng dụng Gmail (MAIL_PASSWORD)."
            ));
        }
    }
}
