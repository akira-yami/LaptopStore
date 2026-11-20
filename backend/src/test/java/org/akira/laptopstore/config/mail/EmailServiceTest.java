package org.akira.laptopstore.config.mail;

/*
 * =========================================================================
 * [TẬP TEST TỰ ĐỘNG - BƯỚC RED TRONG CHU KỲ TDD - EmailServiceTest]:
 * - Tại sao tạo file này:
 *   + Tuân thủ nguyên tắc TDD "Tests BEFORE Code": xây dựng bài kiểm thử tự động
 *     mô tả toàn diện các hành vi của EmailService (gửi email văn bản, gửi email HTML,
 *     xử lý địa chỉ người nhận mặc định `stevenndln@gmail.com`, bắt lỗi ngoại lệ khi SMTP gặp sự cố).
 * - Giữ theo cách cũ thì ảnh hưởng xấu gì:
 *   + Viết trực tiếp logic gửi mail mà không có test tự động sẽ khó phát hiện các lỗi
 *     như: quên set From header, parse sai định dạng MIME HTML, sập ứng dụng khi mail server offline.
 * - Xử lý theo cách mới được lợi gì:
 *   + Đạt kiểm thử chất lượng trước khi viết code (RED -> GREEN).
 *   + Mock toàn bộ JavaMailSender, chạy độc lập mà không cần kết nối mạng internet thật.
 * =========================================================================
 */

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.akira.laptopstore.config.mail.dto.EmailRequest;
import org.akira.laptopstore.config.mail.service.EmailService;
import org.akira.laptopstore.config.mail.service.EmailServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    private EmailService emailService;

    private static final String DEFAULT_SENDER = "stevenndln@gmail.com";
    private static final String DEFAULT_RECIPIENT = "stevenndln@gmail.com";

    @BeforeEach
    void setUp() {
        emailService = new EmailServiceImpl(mailSender, DEFAULT_SENDER, DEFAULT_RECIPIENT);
    }

    @Test
    @DisplayName("Gửi email văn bản thuần túy (Simple Text) thành công với địa chỉ người nhận cụ thể")
    void sendSimpleEmail_Success() {
        EmailRequest request = EmailRequest.builder()
                .to("customer@example.com")
                .subject("Xác nhận đơn hàng #12345")
                .content("Cảm ơn bạn đã đặt mua laptop tại cửa hàng.")
                .isHtml(false)
                .build();

        boolean result = emailService.sendEmail(request);

        assertTrue(result, "Hàm gửi mail phải trả về true khi thành công");
        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, times(1)).send(messageCaptor.capture());

        SimpleMailMessage capturedMessage = messageCaptor.getValue();
        assertEquals(DEFAULT_SENDER, capturedMessage.getFrom(), "Email người gửi phải là stevenndln@gmail.com");
        assertNotNull(capturedMessage.getTo());
        assertEquals("customer@example.com", capturedMessage.getTo()[0]);
        assertEquals("Xác nhận đơn hàng #12345", capturedMessage.getSubject());
        assertEquals("Cảm ơn bạn đã đặt mua laptop tại cửa hàng.", capturedMessage.getText());
    }

    @Test
    @DisplayName("Gửi email khi không truyền người nhận (to là null hoặc rỗng) thì fallback về default: stevenndln@gmail.com")
    void sendEmail_FallbackToDefaultRecipient_WhenToIsEmpty() {
        EmailRequest request = EmailRequest.builder()
                .to(null)
                .subject("Cảnh báo tồn kho biến thể laptop")
                .content("Laptop Dell XPS 15 sắp hết hàng trong kho.")
                .isHtml(false)
                .build();

        boolean result = emailService.sendEmail(request);

        assertTrue(result);
        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, times(1)).send(messageCaptor.capture());

        SimpleMailMessage capturedMessage = messageCaptor.getValue();
        assertEquals(DEFAULT_RECIPIENT, capturedMessage.getTo()[0], "Nếu to rỗng, phải gửi về stevenndln@gmail.com");
    }

    @Test
    @DisplayName("Gửi email định dạng HTML thành công qua MimeMessage")
    void sendHtmlEmail_Success() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        EmailRequest request = EmailRequest.builder()
                .to("vip@example.com")
                .subject("Hóa đơn điện tử")
                .content("<h1>Chúc mừng bạn nhận được ưu đãi!</h1>")
                .isHtml(true)
                .build();

        boolean result = emailService.sendEmail(request);

        assertTrue(result, "Gửi HTML email phải trả về true");
        verify(mailSender, times(1)).createMimeMessage();
        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Khi JavaMailSender ném ngoại lệ (MailException), EmailService bắt lỗi an toàn và trả về false")
    void sendEmail_ShouldHandleExceptionGracefully() {
        doThrow(new RuntimeException("Kết nối SMTP server thất bại"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        EmailRequest request = EmailRequest.builder()
                .to("test@example.com")
                .subject("Kiểm thử lỗi kết nối")
                .content("Nội dung test lỗi")
                .isHtml(false)
                .build();

        boolean result = emailService.sendEmail(request);

        assertFalse(result, "Khi gặp lỗi kết nối SMTP, hàm phải bắt ngoại lệ an toàn và trả về false thay vì crash app");
    }
}
