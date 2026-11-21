package org.akira.laptopstore.security;

import java.security.SecureRandom;
import java.util.Arrays;
import java.util.List;

import org.akira.laptopstore.security.filter.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private static final List<String> DEFAULT_ALLOWED_ORIGIN_PATTERNS = List.of(
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:*");

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint authenticationEntryPoint;
    private final CustomAccessDeniedHandler accessDeniedHandler;

    @Value("${app.cors.allowed-origin-patterns:http://localhost:5173,http://localhost:3000,http://127.0.0.1:*}")
    private String allowedOriginPatterns;

    @Bean
    public SecureRandom secureRandom() {
        return new SecureRandom();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable()) // Tắt CSRF vì dùng JWT
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/api/v1/auth/**", "/api/v1/ai/**", "/api/v1/ping", "/api/v1/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/products/**", "/api/v1/brands/**",
                                "/api/v1/categories/**", "/api/v1/reviews/**")
                        .permitAll()
                        // Ảnh sản phẩm tĩnh: thẻ <img> không gửi JWT nên phải public (GET/HEAD)
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/uploads/**").permitAll()
                        // VNPay không có JWT của user trong hệ thống
                        .requestMatchers(
                                "/api/v1/payments/vnpay/ipn",
                                "/api/v1/payments/vnpay/return")
                        .permitAll()
                        .requestMatchers("/error").permitAll()
                        // Staff endpoints
                        .requestMatchers("/api/v1/staff/**").hasAnyRole("STAFF", "ADMIN")
                        /*
                         * =========================================================================
                         * [TẠI SAO THAY ĐỔI & BẢN CHẤT NGHIỆP VỤ]:
                         * - Lý do thay đổi: Mở quyền truy cập các endpoint catalog quản trị (products, brands, categories)
                         *   cho cả tài khoản nhân viên (STAFF) lẫn quản trị viên (ADMIN).
                         * - Nếu giữ theo cách cũ (chỉ có dòng hasRole("ADMIN") bên dưới):
                         *   Tài khoản STAFF khi đăng nhập vào ca làm việc để quản lý danh mục, thêm/sửa hãng máy
                         *   hoặc cấu hình hình ảnh/biến thể laptop sẽ bị chặn với mã lỗi HTTP 403 Forbidden.
                         * - Xử lý theo cách mới được lợi gì:
                         *   + Cho phép nhân viên vận hành cửa hàng tham gia quản lý thương hiệu và sản phẩm trực tiếp.
                         *   + Quy tắc match URL theo thứ tự từ trên xuống: dòng này đón trước `/api/v1/admin/products/**`,
                         *     `/brands/**`, `/categories/**` cho STAFF & ADMIN, trong khi các endpoint nhạy cảm khác
                         *     của admin (như quản lý user/phân quyền) ở dòng dưới vẫn được bảo vệ nghiêm ngặt chỉ cho ADMIN.
                         * =========================================================================
                         */
                        // Admin & Staff catalog management endpoints
                        .requestMatchers("/api/v1/admin/products/**", "/api/v1/admin/brands/**", "/api/v1/admin/categories/**").hasAnyRole("STAFF", "ADMIN")
                        // Admin endpoints
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")

                        // Authenticated endpoints
                        .requestMatchers("/api/v1/me/**").authenticated()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.stream((allowedOriginPatterns == null ? "" : allowedOriginPatterns).split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        config.setAllowedOriginPatterns(origins.isEmpty() ? DEFAULT_ALLOWED_ORIGIN_PATTERNS : origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
