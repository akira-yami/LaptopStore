package org.akira.laptopstore.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OpenApiConfigTest {

    @Test
    @DisplayName("OpenApiConfig khai báo thông tin API và cấu hình bảo mật JWT Bearer")
    void laptopStoreOpenAPI_containsMetadataAndBearerScheme() {
        OpenApiConfig config = new OpenApiConfig();

        OpenAPI openAPI = config.laptopStoreOpenAPI();

        assertNotNull(openAPI.getInfo());
        assertEquals("LaptopStore API", openAPI.getInfo().getTitle());
        assertEquals("v1", openAPI.getInfo().getVersion());

        assertNotNull(openAPI.getComponents());
        SecurityScheme scheme = openAPI.getComponents().getSecuritySchemes().get(OpenApiConfig.BEARER_SCHEME_NAME);
        assertNotNull(scheme);
        assertEquals(SecurityScheme.Type.HTTP, scheme.getType());
        assertEquals("bearer", scheme.getScheme());
        assertEquals("JWT", scheme.getBearerFormat());

        assertNotNull(openAPI.getSecurity());
        assertTrue(openAPI.getSecurity().stream()
                .anyMatch(req -> req.containsKey(OpenApiConfig.BEARER_SCHEME_NAME)));
    }
}
