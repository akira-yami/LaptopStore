package org.akira.laptopstore.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.akira.laptopstore.mail.controller.AdminEmailController;
import org.akira.laptopstore.mail.dto.EmailRequest;
import org.akira.laptopstore.mail.service.EmailService;
import org.akira.laptopstore.security.CustomAccessDeniedHandler;
import org.akira.laptopstore.security.JwtAuthenticationEntryPoint;
import org.akira.laptopstore.security.SecurityConfig;
import org.akira.laptopstore.security.filter.JwtAuthenticationFilter;
import org.akira.laptopstore.security.jwt.JwtTokenProvider;
import org.akira.laptopstore.security.principal.CustomUserDetails;
import org.akira.laptopstore.security.principal.CustomUserDetailsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminEmailController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class AdminEmailControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private EmailService emailService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private CustomUserDetailsService userDetailsService;

    private CustomUserDetails createPrincipal(Long id, String role) {
        return new CustomUserDetails(
                id,
                "user@example.com",
                "secret",
                0,
                "ACTIVE",
                List.of(new SimpleGrantedAuthority(role))
        );
    }

    @Test
    @DisplayName("POST /api/v1/admin/emails/send-test - Chưa đăng nhập trả về 401 Unauthorized")
    void sendTestEmail_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/admin/emails/send-test")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(emailService);
    }

    @Test
    @DisplayName("POST /api/v1/admin/emails/send-test - Khách hàng ROLE_USER bị chặn 403 Forbidden")
    void sendTestEmail_asUser_returns403() throws Exception {
        CustomUserDetails userPrincipal = createPrincipal(10L, "ROLE_USER");

        mockMvc.perform(post("/api/v1/admin/emails/send-test")
                        .with(user(userPrincipal))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        verifyNoInteractions(emailService);
    }

    @Test
    @DisplayName("POST /api/v1/admin/emails/send-test - Nhân viên ROLE_STAFF bị chặn 403 Forbidden theo FIX-01 (chỉ ADMIN có quyền)")
    void sendTestEmail_asStaff_returns403() throws Exception {
        CustomUserDetails staffPrincipal = createPrincipal(20L, "ROLE_STAFF");

        mockMvc.perform(post("/api/v1/admin/emails/send-test")
                        .with(user(staffPrincipal))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        verifyNoInteractions(emailService);
    }

    @Test
    @DisplayName("POST /api/v1/admin/emails/send-test - Quản trị viên ROLE_ADMIN gửi test với body rỗng -> 200 OK gửi tới email mặc định")
    void sendTestEmail_asAdmin_nullPayload_returns200() throws Exception {
        CustomUserDetails adminPrincipal = createPrincipal(1L, "ROLE_ADMIN");
        when(emailService.sendEmail(any(EmailRequest.class))).thenReturn(true);

        mockMvc.perform(post("/api/v1/admin/emails/send-test")
                        .with(user(adminPrincipal))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.recipient").value("stevenndln@gmail.com"));

        verify(emailService, times(1)).sendEmail(any(EmailRequest.class));
    }

    @Test
    @DisplayName("POST /api/v1/admin/emails/send-test - ROLE_ADMIN gửi payload JSON với isHtml=true -> Jackson map đúng isHtml và trả 200 OK")
    void sendTestEmail_asAdmin_withValidPayload_andHtml() throws Exception {
        CustomUserDetails adminPrincipal = createPrincipal(1L, "ROLE_ADMIN");
        when(emailService.sendEmail(any(EmailRequest.class))).thenReturn(true);

        String jsonPayload = """
                {
                  "to": "client@example.com",
                  "subject": "Tiêu đề test",
                  "content": "<h1>Nội dung HTML</h1>",
                  "isHtml": true
                }
                """;

        mockMvc.perform(post("/api/v1/admin/emails/send-test")
                        .with(user(adminPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.recipient").value("client@example.com"));

        ArgumentCaptor<EmailRequest> captor = ArgumentCaptor.forClass(EmailRequest.class);
        verify(emailService, times(1)).sendEmail(captor.capture());
        EmailRequest sentRequest = captor.getValue();
        assertEquals("client@example.com", sentRequest.getTo());
        assertEquals("Tiêu đề test", sentRequest.getSubject());
        assertEquals("<h1>Nội dung HTML</h1>", sentRequest.getContent());
        assertTrue(sentRequest.isHtml(), "Jackson deserialize phải nhận đúng isHtml = true từ JSON key 'isHtml'");
    }

    @Test
    @DisplayName("POST /api/v1/admin/emails/send-test - Định dạng email người nhận sai cú pháp -> 400 Bad Request")
    void sendTestEmail_asAdmin_invalidEmail_returns400() throws Exception {
        CustomUserDetails adminPrincipal = createPrincipal(1L, "ROLE_ADMIN");

        String invalidPayload = """
                {
                  "to": "invalid-email-address",
                  "subject": "Tiêu đề test",
                  "content": "Nội dung",
                  "isHtml": false
                }
                """;

        mockMvc.perform(post("/api/v1/admin/emails/send-test")
                        .with(user(adminPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(emailService);
    }

    @Test
    @DisplayName("POST /api/v1/admin/emails/send-test - Khi SMTP server gặp sự cố kết nối (emailService trả false) -> 503 Service Unavailable")
    void sendTestEmail_asAdmin_smtpFailure_returns503() throws Exception {
        CustomUserDetails adminPrincipal = createPrincipal(1L, "ROLE_ADMIN");
        when(emailService.sendEmail(any(EmailRequest.class))).thenReturn(false);

        mockMvc.perform(post("/api/v1/admin/emails/send-test")
                        .with(user(adminPrincipal))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false));

        verify(emailService, times(1)).sendEmail(any(EmailRequest.class));
    }
}
