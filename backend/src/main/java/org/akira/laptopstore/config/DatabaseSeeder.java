package org.akira.laptopstore.config; // Điều chỉnh package nếu cần

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.akira.laptopstore.catalog.entity.Brand;
import org.akira.laptopstore.catalog.entity.Product;
import org.akira.laptopstore.catalog.entity.Category;
import org.akira.laptopstore.catalog.entity.ProductVariant;

import org.akira.laptopstore.catalog.repository.CategoryRepository;
import org.akira.laptopstore.catalog.repository.BrandRepository;
import org.akira.laptopstore.catalog.repository.ProductRepository;
import org.akira.laptopstore.catalog.repository.ProductVariantRepository;



import org.akira.laptopstore.procurement.repository.SupplierRepository;
import org.akira.laptopstore.procurement.entity.Supplier;


import org.akira.laptopstore.user.entity.Role;
import org.akira.laptopstore.user.entity.User;

import org.akira.laptopstore.user.repository.RoleRepository;
import org.akira.laptopstore.user.repository.UserRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseSeeder implements CommandLineRunner {

    @Value("${APP_SEED_DEMO_DATA:true}")
    private boolean seedDemoData;

    @Value("${ADMIN_BOOTSTRAP_EMAIL:}")
    private String adminBootstrapEmail;

    @Value("${ADMIN_BOOTSTRAP_PASSWORD:}")
    private String adminBootstrapPassword;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository; // Bổ sung kho lưu trữ Role
    private final PasswordEncoder passwordEncoder;
    private final SupplierRepository supplierRepository;
    private final BrandRepository brandRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;

    @Override
    public void run(String... args) throws Exception {
        String adminEmail = "kietadmin@gmail.com";
        if (!seedDemoData) {
            // Rotate an insecure demo credential if a prior startup seeded it.
            userRepository.findByEmailIgnoreCase(adminEmail).ifPresent(existing -> {
                if (passwordEncoder.matches("password123", existing.getPasswordHash())) {
                    if (adminBootstrapPassword == null || adminBootstrapPassword.isBlank()) {
                        throw new IllegalStateException(
                                "ADMIN_BOOTSTRAP_PASSWORD is required to rotate insecure demo admin");
                    }
                    existing.setPasswordHash(passwordEncoder.encode(adminBootstrapPassword));
                    existing.setTokenVersion(existing.getTokenVersion() + 1);
                    userRepository.save(existing);
                    log.warn("Rotated unsafe demo admin credential for production");
                }
            });
            bootstrapConfiguredAdmin();
            return;
        }


        if (userRepository.findByEmailIgnoreCase(adminEmail).isEmpty()) {
            // 1. Tìm Role ADMIN trong DB, nếu chưa có thì tự động tạo mới
            Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                    .orElseGet(() -> roleRepository.save(Role.builder().name("ROLE_ADMIN").build()));

            // 2. Khởi tạo tài khoản với Set<Role> và trường passwordHash chuẩn xác
            User admin = User.builder()
                    .email(adminEmail)
                    .passwordHash(passwordEncoder.encode("password123")) // Đã đổi thành passwordHash
                    .fullName("Huỳnh Thái Kiệt")
                    .phone("0123456789")
                    .status("ACTIVE")
                    .roles(Set.of(adminRole)) // Truyền chính xác Set<Role>
                    .build();

            userRepository.save(admin);
            log.info("Da khoi tao thanh cong tai khoan ADMIN mac dinh: {}", adminEmail);
        }
        // 1. Khởi tạo Nhà cung cấp (Supplier)
        if (supplierRepository.count() == 0) {
            supplierRepository.save(Supplier.builder()
                    .name("Nhà phân phối Asus VN")
                    .phone("0909123456")
                    .email("contact@asus.vn")
                    .address("Quận 1, TP.HCM")
                    .status("ACTIVE")
                    .build());
            log.info("Da khoi tao Supplier mac dinh.");
        }

        // 2. Khởi tạo Brand và Category
        if (categoryRepository.count() == 0 && brandRepository.count() == 0) {
            Category category = categoryRepository.save(Category.builder().name("Laptop Gaming").active(true).build());
            Brand brand = brandRepository.save(Brand.builder().name("Asus").active(true).build());

            // 3. Khởi tạo Product và ProductVariant (Tồn kho ban đầu = 0)
            Product product = Product.builder()
                    .name("Asus ROG Strix G15")
                    .description("Laptop Gaming quoc dan")
                    .status("ACTIVE")
                    .active(true)
                    .category(category)
                    .brand(brand)
                    .build();

            product = productRepository.save(product);

            ProductVariant variant = ProductVariant.builder()
                    .product(product)
                    .ram("16GB")
                    .storage("512GB SSD")
                    .color("Eclipse Gray")
                    .price(new java.math.BigDecimal("25000000"))
                    .quantity(0) // TỒN KHO BAN ĐẦU BẰNG 0
                    .sku("ASUS-ROG-G15-01")
                    .status("ACTIVE")
                    .active(true)
                    .build();

            productVariantRepository.save(variant);
            log.info("Da khoi tao Product và Variant mac dinh.");
        }

        else {
            log.info("Tai khoan ADMIN da ton tai, bo qua buoc khoi tao.");
        }
    }

    private void bootstrapConfiguredAdmin() {
        if (adminBootstrapEmail == null || adminBootstrapEmail.isBlank()
                || adminBootstrapPassword == null || adminBootstrapPassword.isBlank()) {
            return;
        }

        String normalizedEmail = adminBootstrapEmail.trim().toLowerCase(Locale.ROOT);
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseGet(() -> roleRepository.save(Role.builder().name("ROLE_ADMIN").build()));

        userRepository.findByEmailIgnoreCase(normalizedEmail).ifPresentOrElse(existing -> {
            boolean changed = false;
            if (!passwordEncoder.matches(adminBootstrapPassword, existing.getPasswordHash())) {
                existing.setPasswordHash(passwordEncoder.encode(adminBootstrapPassword));
                existing.setTokenVersion(existing.getTokenVersion() + 1);
                changed = true;
            }
            if (!"ACTIVE".equals(existing.getStatus())) {
                existing.setStatus("ACTIVE");
                changed = true;
            }
            Set<Role> roles = existing.getRoles() == null ? new HashSet<>() : new HashSet<>(existing.getRoles());
            boolean hasAdminRole = roles.stream().anyMatch(r -> "ROLE_ADMIN".equals(r.getName()));
            if (!hasAdminRole) {
                roles.add(adminRole);
                existing.setRoles(roles);
                changed = true;
            }
            if (changed) {
                userRepository.save(existing);
                log.info("Updated configured ADMIN account: {}", normalizedEmail);
            }
        }, () -> {
            User admin = User.builder()
                    .email(normalizedEmail)
                    .passwordHash(passwordEncoder.encode(adminBootstrapPassword))
                    .fullName("Administrator")
                    .phone("0900000000")
                    .status("ACTIVE")
                    .roles(new HashSet<>(Set.of(adminRole)))
                    .build();
            userRepository.save(admin);
            log.info("Created configured ADMIN account: {}", normalizedEmail);
        });
    }
}