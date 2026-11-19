package org.akira.laptopstore.health.controller;

import org.akira.laptopstore.health.dto.HealthResponse;
import org.akira.laptopstore.health.dto.PingResponse;
import org.akira.laptopstore.health.service.HealthService;
import org.akira.laptopstore.security.CustomAccessDeniedHandler;
import org.akira.laptopstore.security.JwtAuthenticationEntryPoint;
import org.akira.laptopstore.security.SecurityConfig;
import org.akira.laptopstore.security.filter.JwtAuthenticationFilter;
import org.akira.laptopstore.security.jwt.JwtTokenProvider;
import org.akira.laptopstore.security.principal.CustomUserDetailsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(HealthController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private HealthService healthService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private CustomUserDetailsService userDetailsService;

    @Test
    @DisplayName("GET /api/v1/ping - should be public and return 200 OK with pong message")
    void ping_shouldReturnOkWithPong() throws Exception {
        PingResponse pingResponse = PingResponse.builder()
                .status("UP")
                .message("pong")
                .timestamp(Instant.now())
                .build();

        when(healthService.ping()).thenReturn(pingResponse);

        mockMvc.perform(get("/api/v1/ping"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.message").value("pong"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("GET /api/v1/health - should be public and return 200 OK when system is UP")
    void checkHealth_whenHealthy_shouldReturnOk() throws Exception {
        HealthResponse healthResponse = HealthResponse.builder()
                .status("UP")
                .database("UP")
                .uptimeMs(12345L)
                .timestamp(Instant.now())
                .build();

        when(healthService.checkHealth()).thenReturn(healthResponse);

        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.database").value("UP"))
                .andExpect(jsonPath("$.uptimeMs").value(12345L))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("GET /api/v1/health - should return 503 SERVICE_UNAVAILABLE when database is DOWN")
    void checkHealth_whenDown_shouldReturnServiceUnavailable() throws Exception {
        HealthResponse healthResponse = HealthResponse.builder()
                .status("DOWN")
                .database("DOWN")
                .uptimeMs(12345L)
                .timestamp(Instant.now())
                .error("Connection refused")
                .build();

        when(healthService.checkHealth()).thenReturn(healthResponse);

        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value("DOWN"))
                .andExpect(jsonPath("$.database").value("DOWN"))
                .andExpect(jsonPath("$.error").value("Connection refused"));
    }
}
