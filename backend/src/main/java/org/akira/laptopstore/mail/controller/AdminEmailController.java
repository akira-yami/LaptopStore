package org.akira.laptopstore.mail.controller;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.akira.laptopstore.mail.dto.EmailRequest;
import org.akira.laptopstore.mail.service.EmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller cung cấp endpoint kiểm thử kết nối SMTP gửi email.
 * Giới hạn truy cập nghiêm ngặt chỉ dành cho quản trị viên (ADMIN) để chống lạm dụng Open Mail Relay.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/emails")
public class AdminEmailController {

    private final EmailService emailService;
    private final String defaultTo;

    public AdminEmailController(
            EmailService emailService,
            @Value("${app.mail.default-to:stevenndln@gmail.com}") String defaultTo) {
        this.emailService = emailService;
        this.defaultTo = defaultTo;
    }

    /**
     * Endpoint gửi email thử nghiệm kết nối SMTP.
     * Chỉ người dùng có quyền ROLE_ADMIN mới được phép kích hoạt.
     */
    @PostMapping("/send-test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> sendTestEmail(@Valid @RequestBody(required = false) EmailRequest request) {
        if (request == null) {
            request = EmailRequest.builder()
                    .to(defaultTo)
                    .subject("[LaptopStore] Thử nghiệm kết nối hệ thống Mail")
                    .content("<h1>Xin chào Quản trị viên!</h1><p>Hệ thống gửi email tự động của LaptopStore hoạt động ổn định qua SMTP Gmail.</p>")
                    .isHtml(true)
                    .build();
        }

        String resolvedRecipient = StringUtils.hasText(request.getTo()) ? request.getTo().trim() : defaultTo;

        boolean sent = emailService.sendEmail(request);

        if (sent) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Gửi email thử nghiệm thành công tới: " + resolvedRecipient,
                    "recipient", resolvedRecipient,
                    "subject", request.getSubject()
            ));
        } else {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "success", false,
                    "message", "Không thể gửi email do lỗi kết nối máy chủ SMTP. Vui lòng kiểm tra lại thông số cấu hình và mật khẩu ứng dụng Gmail (MAIL_PASSWORD)."
            ));
        }
    }
}
