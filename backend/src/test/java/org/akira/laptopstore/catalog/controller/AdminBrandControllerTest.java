package org.akira.laptopstore.catalog.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.akira.laptopstore.catalog.dto.request.CreateBrandRequest;
import org.akira.laptopstore.catalog.dto.request.UpdateBrandRequest;
import org.akira.laptopstore.catalog.dto.response.BrandResponse;
import org.akira.laptopstore.catalog.service.BrandService;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.akira.laptopstore.exception.GlobalExceptionHandler;

@WebMvcTest(AdminBrandController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class, GlobalExceptionHandler.class})
class AdminBrandControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private BrandService brandService;

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
    @DisplayName("GET /api/v1/admin/brands - Chưa đăng nhập trả về 401 Unauthorized")
    void getAllBrands_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/admin/brands"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(brandService);
    }

    @Test
    @DisplayName("GET /api/v1/admin/brands - Tài khoản ROLE_USER bị chặn 403 Forbidden")
    void getAllBrands_asUser_returns403() throws Exception {
        CustomUserDetails userPrincipal = createPrincipal(10L, "ROLE_USER");

        mockMvc.perform(get("/api/v1/admin/brands").with(user(userPrincipal)))
                .andExpect(status().isForbidden());

        verifyNoInteractions(brandService);
    }

    @Test
    @DisplayName("GET /api/v1/admin/brands - STAFF lấy danh sách thương hiệu (kể cả tạm ẩn) trả 200 OK")
    void getAllBrands_asStaff_returns200() throws Exception {
        CustomUserDetails staffPrincipal = createPrincipal(20L, "ROLE_STAFF");
        BrandResponse b1 = BrandResponse.builder().id(1L).name("ASUS").active(true).build();
        BrandResponse b2 = BrandResponse.builder().id(2L).name("DELL").active(false).build();

        when(brandService.findAllBrandsForAdmin()).thenReturn(List.of(b1, b2));

        mockMvc.perform(get("/api/v1/admin/brands").with(user(staffPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("ASUS"))
                .andExpect(jsonPath("$[1].active").value(false));

        verify(brandService).findAllBrandsForAdmin();
    }

    @Test
    @DisplayName("POST /api/v1/admin/brands - ADMIN tạo thương hiệu thành công trả 201 Created")
    void createBrand_asAdmin_validPayload_returns201() throws Exception {
        CustomUserDetails adminPrincipal = createPrincipal(1L, "ROLE_ADMIN");
        CreateBrandRequest request = new CreateBrandRequest("Apple", "MacBook Pro");
        BrandResponse response = BrandResponse.builder().id(3L).name("Apple").active(true).build();

        when(brandService.createBrand(any(CreateBrandRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/admin/brands")
                        .with(user(adminPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.name").value("Apple"));

        verify(brandService).createBrand(any(CreateBrandRequest.class));
    }

    @Test
    @DisplayName("POST /api/v1/admin/brands - Tạo thương hiệu với tên rỗng trả 400 Bad Request")
    void createBrand_invalidPayload_returns400() throws Exception {
        CustomUserDetails adminPrincipal = createPrincipal(1L, "ROLE_ADMIN");
        CreateBrandRequest request = new CreateBrandRequest("", "Mô tả");

        mockMvc.perform(post("/api/v1/admin/brands")
                        .with(user(adminPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(brandService);
    }

    @Test
    @DisplayName("PUT /api/v1/admin/brands/{id} - Cập nhật thương hiệu thành công trả 200 OK")
    void updateBrand_validPayload_returns200() throws Exception {
        CustomUserDetails staffPrincipal = createPrincipal(20L, "ROLE_STAFF");
        UpdateBrandRequest request = new UpdateBrandRequest("Apple Silicon", "Cập nhật");
        BrandResponse response = BrandResponse.builder().id(3L).name("Apple Silicon").active(true).build();

        when(brandService.updateBrand(eq(3L), any(UpdateBrandRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/v1/admin/brands/3")
                        .with(user(staffPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Apple Silicon"));

        verify(brandService).updateBrand(eq(3L), any(UpdateBrandRequest.class));
    }

    @Test
    @DisplayName("DELETE /api/v1/admin/brands/{id} - Xóa mềm thương hiệu trả 200 OK")
    void deleteBrand_asAdmin_returns200() throws Exception {
        CustomUserDetails adminPrincipal = createPrincipal(1L, "ROLE_ADMIN");
        doNothing().when(brandService).deleteBrand(3L);

        mockMvc.perform(delete("/api/v1/admin/brands/3").with(user(adminPrincipal)))
                .andExpect(status().isOk());

        verify(brandService).deleteBrand(3L);
    }

    @Test
    @DisplayName("PATCH /api/v1/admin/brands/{id}/status - Đổi trạng thái hiển thị trả 200 OK")
    void updateBrandStatus_returns200() throws Exception {
        CustomUserDetails staffPrincipal = createPrincipal(20L, "ROLE_STAFF");
        doNothing().when(brandService).updateBrandStatus(3L, true);

        mockMvc.perform(patch("/api/v1/admin/brands/3/status?active=true").with(user(staffPrincipal)))
                .andExpect(status().isOk());

        verify(brandService).updateBrandStatus(3L, true);
    }
}
