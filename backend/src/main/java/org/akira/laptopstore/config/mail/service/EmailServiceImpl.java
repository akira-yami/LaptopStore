package org.akira.laptopstore.config.mail.service;

/*
 * =========================================================================
 * [TRIỂN KHAI DỊCH VỤ EMAIL THỰC TẾ - EmailServiceImpl]:
 * - Tại sao triển khai service này:
 *   + Hiện thực hóa interface `EmailService` bằng việc tích hợp `JavaMailSender` của Spring Boot Starter Mail.
 *   + Tự động quản lý địa chỉ gửi mặc định và địa chỉ nhận dự phòng (`stevenndln@gmail.com`).
 * - Giữ theo cách cũ (ném exception trực tiếp ra ngoài controller/service gọi):
 *   + Khi mạng lag, sai mật khẩu ứng dụng Gmail hoặc SMTP server bị ngắt kết nối,
 *     toàn bộ giao dịch nghiệp vụ (như tạo đơn hàng thành công, đổi trạng thái variant)
 *     sẽ bị rollback hoặc người dùng nhận mã lỗi 500 sập trang.
 * - Xử lý theo cách mới được lợi gì:
 *   + Sử dụng cơ chế Try-Catch bọc toàn diện, ghi log lỗi chuẩn xác và trả cờ boolean an toàn.
 *   + Hỗ trợ cấu hình UTF-8 toàn diện cho cả tiêu đề lẫn nội dung HTML, tránh vỡ font chữ tiếng Việt.
 *   + Tự động fallback về email mặc định `stevenndln@gmail.com` khi người nhận rỗng.
 * =========================================================================
 */

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.akira.laptopstore.config.mail.dto.EmailRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Slf4j
@Service
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;
    private final String defaultFrom;
    private final String defaultTo;

    public EmailServiceImpl(
            JavaMailSender mailSender,
            @Value("${app.mail.from:stevenndln@gmail.com}") String defaultFrom,
            @Value("${app.mail.default-to:stevenndln@gmail.com}") String defaultTo) {
        this.mailSender = mailSender;
        this.defaultFrom = defaultFrom;
        this.defaultTo = defaultTo;
    }

    @Override
    public boolean sendEmail(EmailRequest request) {
        if (request == null) {
            log.warn("[EMAIL] EmailRequest bị null, hủy bỏ tác vụ gửi mail.");
            return false;
        }

        String recipient = (request.getTo() != null && !request.getTo().trim().isEmpty())
                ? request.getTo().trim()
                : defaultTo;

        try {
            if (request.isHtml()) {
                sendMimeMessage(recipient, request.getSubject(), request.getContent());
            } else {
                sendSimpleMessage(recipient, request.getSubject(), request.getContent());
            }
            log.info("[EMAIL] Gửi email thành công tới: {} | Tiêu đề: {}", recipient, request.getSubject());
            return true;
        } catch (MailException | MessagingException ex) {
            log.error("[EMAIL] Lỗi khi gửi email tới {} với tiêu đề {}: {}", recipient, request.getSubject(), ex.getMessage(), ex);
            return false;
        } catch (Exception ex) {
            log.error("[EMAIL] Ngoại lệ không xác định khi gửi mail: {}", ex.getMessage(), ex);
            return false;
        }
    }

    @Override
    public boolean sendSimpleEmail(String to, String subject, String content) {
        return sendEmail(EmailRequest.builder()
                .to(to)
                .subject(subject)
                .content(content)
                .isHtml(false)
                .build());
    }

    @Override
    public boolean sendHtmlEmail(String to, String subject, String htmlContent) {
        return sendEmail(EmailRequest.builder()
                .to(to)
                .subject(subject)
                .content(htmlContent)
                .isHtml(true)
                .build());
    }

    private void sendSimpleMessage(String recipient, String subject, String content) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(defaultFrom);
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(content);
        mailSender.send(message);
    }

    private void sendMimeMessage(String recipient, String subject, String htmlContent) throws MessagingException {
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(
                mimeMessage,
                MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                StandardCharsets.UTF_8.name());

        helper.setFrom(defaultFrom);
        helper.setTo(recipient);
        helper.setSubject(subject);
        helper.setText(htmlContent, true); // true = nội dung dạng HTML

        mailSender.send(mimeMessage);
    }
}
