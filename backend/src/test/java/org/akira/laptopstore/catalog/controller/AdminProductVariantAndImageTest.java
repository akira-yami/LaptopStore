package org.akira.laptopstore.catalog.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.akira.laptopstore.catalog.dto.request.UpdateProductImageRequest;
import org.akira.laptopstore.catalog.dto.request.UpdateVariantRequest;
import org.akira.laptopstore.catalog.dto.response.ProductImageDto;
import org.akira.laptopstore.catalog.dto.response.VariantSnapshot;
import org.akira.laptopstore.catalog.mapper.ProductMapper;
import org.akira.laptopstore.catalog.service.ProductService;
import org.akira.laptopstore.catalog.service.ProductVariantService;
import org.akira.laptopstore.security.CustomAccessDeniedHandler;
import org.akira.laptopstore.security.JwtAuthenticationEntryPoint;
import org.akira.laptopstore.security.SecurityConfig;
import org.akira.laptopstore.security.filter.JwtAuthenticationFilter;
import org.akira.laptopstore.security.jwt.JwtTokenProvider;
import org.akira.laptopstore.security.principal.CustomUserDetails;
import org.akira.laptopstore.security.principal.CustomUserDetailsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.akira.laptopstore.exception.GlobalExceptionHandler;

@WebMvcTest(AdminProductController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class, GlobalExceptionHandler.class})
class AdminProductVariantAndImageTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private ProductService productService;

    @MockitoBean
    private ProductVariantService productVariantService;

    @MockitoBean
    private ProductMapper productMapper;

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
    @DisplayName("PUT /api/v1/admin/products/{productId}/variants/{variantId} - Chưa đăng nhập trả 401")
    void updateVariant_unauthenticated_returns401() throws Exception {
        mockMvc.perform(put("/api/v1/admin/products/1/variants/10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(productVariantService);
    }

    @Test
    @DisplayName("PUT /api/v1/admin/products/{productId}/variants/{variantId} - ROLE_USER bị chặn 403")
    void updateVariant_asUser_returns403() throws Exception {
        CustomUserDetails userPrincipal = createPrincipal(10L, "ROLE_USER");

        mockMvc.perform(put("/api/v1/admin/products/1/variants/10")
                        .with(user(userPrincipal))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        verifyNoInteractions(productVariantService);
    }

    @Test
    @DisplayName("PUT /api/v1/admin/products/{productId}/variants/{variantId} - STAFF cập nhật biến thể thành công trả 200 OK")
    void updateVariant_asStaff_returns200() throws Exception {
        CustomUserDetails staffPrincipal = createPrincipal(20L, "ROLE_STAFF");

        UpdateVariantRequest request = UpdateVariantRequest.builder()
                .sku("ASUS-ZEN-01")
                .variantName("16GB - 512GB")
                .price(BigDecimal.valueOf(25000000))
                .status("ACTIVE")
                .color("Xám")
                .ram("16GB")
                .storage("512GB")
                .build();

        VariantSnapshot snapshot = VariantSnapshot.builder()
                .id(10L)
                .sku("ASUS-ZEN-01")
                .price(BigDecimal.valueOf(25000000))
                .color("Xám")
                .ram("16GB")
                .storage("512GB")
                .status("ACTIVE")
                .active(true)
                .build();

        when(productVariantService.updateVariant(eq(1L), eq(10L), any(UpdateVariantRequest.class)))
                .thenReturn(snapshot);

        mockMvc.perform(put("/api/v1/admin/products/1/variants/10")
                        .with(user(staffPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.sku").value("ASUS-ZEN-01"))
                .andExpect(jsonPath("$.active").value(true));

        verify(productVariantService).updateVariant(eq(1L), eq(10L), any(UpdateVariantRequest.class));
    }

    @Test
    @DisplayName("PATCH /api/v1/admin/products/{productId}/variants/{variantId}/status - Bật/tắt bán variant trả 200 OK")
    void updateVariantStatus_returns200() throws Exception {
        CustomUserDetails adminPrincipal = createPrincipal(1L, "ROLE_ADMIN");
        doNothing().when(productVariantService).updateVariantActiveStatus(1L, 10L, false);

        mockMvc.perform(patch("/api/v1/admin/products/1/variants/10/status?active=false")
                        .with(user(adminPrincipal)))
                .andExpect(status().isOk());

        verify(productVariantService).updateVariantActiveStatus(1L, 10L, false);
    }

    @Test
    @DisplayName("PUT /api/v1/admin/products/{productId}/images - Cập nhật bộ sưu tập ảnh thành công trả 200 OK")
    void updateProductImages_validPayload_returns200() throws Exception {
        CustomUserDetails staffPrincipal = createPrincipal(20L, "ROLE_STAFF");

        List<UpdateProductImageRequest> requests = List.of(
                UpdateProductImageRequest.builder().imageUrl("/uploads/products/p1-front.jpg").isPrimary(true).build(),
                UpdateProductImageRequest.builder().imageUrl("/uploads/products/p1-side.jpg").isPrimary(false).build()
        );

        List<ProductImageDto> updatedImages = List.of(
                ProductImageDto.builder().id(1L).imageUrl("/uploads/products/p1-front.jpg").isPrimary(true).build(),
                ProductImageDto.builder().id(2L).imageUrl("/uploads/products/p1-side.jpg").isPrimary(false).build()
        );

        when(productService.updateProductImages(eq(1L), anyList())).thenReturn(updatedImages);

        mockMvc.perform(put("/api/v1/admin/products/1/images")
                        .with(user(staffPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requests)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].isPrimary").value(true));

        verify(productService).updateProductImages(eq(1L), anyList());
    }

    @Test
    @DisplayName("PUT /api/v1/admin/products/{productId}/images - Ảnh có imageUrl rỗng trả 400 Bad Request")
    void updateProductImages_blankImageUrl_returns400() throws Exception {
        CustomUserDetails staffPrincipal = createPrincipal(20L, "ROLE_STAFF");

        List<UpdateProductImageRequest> invalidRequests = List.of(
                UpdateProductImageRequest.builder().imageUrl("   ").isPrimary(true).build()
        );

        mockMvc.perform(put("/api/v1/admin/products/1/images")
                        .with(user(staffPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequests)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(productService);
    }
}
