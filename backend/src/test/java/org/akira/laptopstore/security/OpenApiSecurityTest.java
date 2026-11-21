package org.akira.laptopstore.security;

import org.akira.laptopstore.config.OpenApiConfig;
import org.akira.laptopstore.health.controller.HealthController;
import org.akira.laptopstore.health.service.HealthService;
import org.akira.laptopstore.security.filter.JwtAuthenticationFilter;
import org.akira.laptopstore.security.jwt.JwtProperties;
import org.akira.laptopstore.security.jwt.JwtTokenProvider;
import org.akira.laptopstore.security.principal.CustomUserDetailsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springdoc.core.configuration.SpringDocConfiguration;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springdoc.core.properties.SwaggerUiConfigParameters;
import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springdoc.core.properties.SwaggerUiOAuthProperties;
import org.springdoc.webmvc.core.configuration.SpringDocWebMvcConfiguration;
import org.springdoc.webmvc.ui.SwaggerConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OpenApiSecurityTest {

    @Nested
    @WebMvcTest(HealthController.class)
    @Import({
            SecurityConfig.class,
            JwtProperties.class,
            JwtAuthenticationFilter.class,
            JwtAuthenticationEntryPoint.class,
            CustomAccessDeniedHandler.class,
            OpenApiConfig.class,
            SpringDocConfiguration.class,
            SpringDocConfigProperties.class,
            SpringDocWebMvcConfiguration.class,
            SwaggerConfig.class,
            SwaggerUiConfigProperties.class,
            SwaggerUiOAuthProperties.class,
            SwaggerUiConfigParameters.class
    })
    @TestPropertySource(properties = {
            "app.swagger.enabled=true",
            "springdoc.api-docs.enabled=true",
            "springdoc.swagger-ui.enabled=true",
            "springdoc.swagger-ui.path=/swagger-ui.html"
    })
    class WhenSwaggerEnabled {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private HealthService healthService;

        @MockitoBean
        private JwtTokenProvider jwtTokenProvider;

        @MockitoBean
        private CustomUserDetailsService userDetailsService;

        @Test
        @DisplayName("GET /swagger-ui.html công khai và redirect sang Swagger UI khi bật app.swagger.enabled=true")
        void swaggerUiHtml_redirectsPubliclyWhenEnabled() throws Exception {
            mockMvc.perform(get("/swagger-ui.html"))
                    .andExpect(status().is3xxRedirection())
                    .andExpect(header().string("Location", containsString("/swagger-ui/index.html")));
        }

        @Test
        @DisplayName("GET /v3/api-docs trả 200 với OpenAPI spec có metadata LaptopStore và bearerAuth")
        void openApiDocs_returnsValidSpecWhenEnabled() throws Exception {
            mockMvc.perform(get("/v3/api-docs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.openapi").exists())
                    .andExpect(jsonPath("$.info.title").value("LaptopStore API"))
                    .andExpect(jsonPath("$.info.version").value("v1"))
                    .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"))
                    .andExpect(jsonPath("$.paths['/api/v1/health']").exists());
        }

        @Test
        @DisplayName("GET /v3/api-docs/swagger-config trả 200 công khai khi bật app.swagger.enabled=true")
        void openApiSwaggerConfig_isPublicWhenEnabled() throws Exception {
            mockMvc.perform(get("/v3/api-docs/swagger-config"))
                    .andExpect(status().isOk())
                    .andExpect(content().string(containsString("/v3/api-docs")));
        }
    }

    @Nested
    @WebMvcTest(HealthController.class)
    @Import({SecurityConfig.class, JwtProperties.class, JwtAuthenticationFilter.class,
            JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
    @TestPropertySource(properties = {
            "app.swagger.enabled=false",
            "springdoc.api-docs.enabled=false",
            "springdoc.swagger-ui.enabled=false"
    })
    class WhenSwaggerDisabled {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private HealthService healthService;

        @MockitoBean
        private JwtTokenProvider jwtTokenProvider;

        @MockitoBean
        private CustomUserDetailsService userDetailsService;

        @Test
        @DisplayName("GET /swagger-ui.html trả 401 khi tắt app.swagger.enabled=false")
        void swaggerUiHtml_returns401WhenDisabled() throws Exception {
            mockMvc.perform(get("/swagger-ui.html"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /v3/api-docs trả 401 khi tắt app.swagger.enabled=false")
        void openApiDocs_returns401WhenDisabled() throws Exception {
            mockMvc.perform(get("/v3/api-docs"))
                    .andExpect(status().isUnauthorized());
        }
    }
}
