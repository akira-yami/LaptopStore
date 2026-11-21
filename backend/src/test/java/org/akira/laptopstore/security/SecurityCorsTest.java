package org.akira.laptopstore.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.akira.laptopstore.auth.controller.AuthController;
import org.akira.laptopstore.auth.dto.AuthResponse;
import org.akira.laptopstore.auth.dto.LoginRequest;
import org.akira.laptopstore.auth.service.AuthService;
import org.akira.laptopstore.security.filter.JwtAuthenticationFilter;
import org.akira.laptopstore.security.jwt.JwtProperties;
import org.akira.laptopstore.security.jwt.JwtTokenProvider;
import org.akira.laptopstore.security.principal.CustomUserDetailsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.head;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtProperties.class, JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
@TestPropertySource(properties = {
        "app.cors.allowed-origin-patterns=https://web-production-9909b59f.up.railway.app, http://localhost:5173"
})
class SecurityCorsTest {

    private static final String RAILWAY_ORIGIN = "https://web-production-9909b59f.up.railway.app";

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private CustomUserDetailsService userDetailsService;

    @Test
    @DisplayName("POST /api/v1/auth/login chấp nhận Origin production được cấu hình qua app.cors.allowed-origin-patterns")
    void login_withConfiguredProductionOrigin_isAllowed() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("token")
                .userId(1L)
                .email("user@example.com")
                .fullName("Test User")
                .roles(Set.of("ROLE_USER"))
                .build();
        when(authService.login(any(LoginRequest.class)))
                .thenReturn(new AuthService.AuthResult(authResponse, "refresh-token"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .header(HttpHeaders.ORIGIN, RAILWAY_ORIGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, RAILWAY_ORIGIN))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    @DisplayName("OPTIONS preflight chấp nhận Origin production được cấu hình")
    void preflight_withConfiguredProductionOrigin_isAllowed() throws Exception {
        mockMvc.perform(options("/api/v1/auth/login")
                        .header(HttpHeaders.ORIGIN, RAILWAY_ORIGIN)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Content-Type,Authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, RAILWAY_ORIGIN))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login từ chối Origin lạ không nằm trong danh sách cấu hình")
    void login_withDisallowedOrigin_returns403() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .header(HttpHeaders.ORIGIN, "https://evil.example.com")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("HEAD /uploads/** được phép public không trả 401")
    void headUploads_isPublic() throws Exception {
        mockMvc.perform(head("/uploads/products/product-01.jpg"))
                .andExpect(status().is(not(401)));
    }
}
