package org.akira.laptopstore.mail.service.impl;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.akira.laptopstore.mail.dto.EmailRequest;
import org.akira.laptopstore.mail.service.EmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;

/**
 * Triển khai dịch vụ gửi email qua Spring JavaMailSender.
 * Chỉ bắt các ngoại lệ hạ tầng gửi thư (MailException, MessagingException) và không nuốt RuntimeException lập trình.
 */
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
            throw new IllegalArgumentException("Yêu cầu gửi email không được để trống (null)");
        }
        if (!StringUtils.hasText(request.getSubject()) || !StringUtils.hasText(request.getContent())) {
            throw new IllegalArgumentException("Tiêu đề và nội dung email không được để trống");
        }

        String recipient = StringUtils.hasText(request.getTo()) ? request.getTo().trim() : defaultTo;

        try {
            if (request.isHtml()) {
                sendMimeMessage(recipient, request.getSubject(), request.getContent());
            } else {
                sendSimpleMessage(recipient, request.getSubject(), request.getContent());
            }
            log.info("[EMAIL] Đã gửi email thành công tới: {} | Tiêu đề: {}", recipient, request.getSubject());
            return true;
        } catch (MailException | MessagingException ex) {
            log.error("[EMAIL] Lỗi kết nối máy chủ SMTP khi gửi tới {}: {}", recipient, ex.getMessage(), ex);
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
        helper.setText(htmlContent, true);

        mailSender.send(mimeMessage);
    }
}
