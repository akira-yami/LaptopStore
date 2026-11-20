package org.akira.laptopstore.config.mail;

/*
 * =========================================================================
 * [TẬP TEST TỰ ĐỘNG CHO CONTROLLER - AdminEmailControllerTest]:
 * - Tại sao tạo file này:
 *   + Kiểm thử tầng giao tiếp API của AdminEmailController (mocking EmailService).
 *   + Đảm bảo endpoint `/api/v1/admin/emails/send-test` xử lý chuẩn xác cả khi request null
 *     (tự khởi tạo default tới `stevenndln@gmail.com`) lẫn khi truyền payload tùy chỉnh.
 * - Giữ theo cách cũ:
 *   + Thiếu unit test tầng controller sẽ không phát hiện được lỗi format JSON trả về.
 * - Xử lý theo cách mới được lợi gì:
 *   + Đảm bảo API trả về đúng HTTP 200 khi gửi thành công và HTTP 400 khi thất bại.
 * =========================================================================
 */

import org.akira.laptopstore.config.mail.controller.AdminEmailController;
import org.akira.laptopstore.config.mail.dto.EmailRequest;
import org.akira.laptopstore.config.mail.service.EmailService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminEmailControllerTest {

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AdminEmailController adminEmailController;

    @Test
    @DisplayName("Admin hoặc Staff gửi email test với payload rỗng thì controller tự tạo mặc định gửi tới stevenndln@gmail.com")
    void sendTestEmail_WithNullPayload_ShouldSendDefaultEmail() {
        when(emailService.sendEmail(any(EmailRequest.class))).thenReturn(true);

        ResponseEntity<Map<String, Object>> response = adminEmailController.sendTestEmail(null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(true, response.getBody().get("success"));
        verify(emailService, times(1)).sendEmail(any(EmailRequest.class));
    }

    @Test
    @DisplayName("Gửi email thành công với payload tùy chỉnh")
    void sendTestEmail_Success() {
        EmailRequest request = EmailRequest.builder()
                .to("client@example.com")
                .subject("Test thông báo")
                .content("Nội dung text")
                .isHtml(false)
                .build();

        when(emailService.sendEmail(any(EmailRequest.class))).thenReturn(true);

        ResponseEntity<Map<String, Object>> response = adminEmailController.sendTestEmail(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(true, response.getBody().get("success"));
        assertEquals("client@example.com", response.getBody().get("recipient"));
    }

    @Test
    @DisplayName("Gửi email thất bại khi emailService trả về false")
    void sendTestEmail_Failure() {
        when(emailService.sendEmail(any(EmailRequest.class))).thenReturn(false);

        ResponseEntity<Map<String, Object>> response = adminEmailController.sendTestEmail(null);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(false, response.getBody().get("success"));
    }
}
