package org.akira.laptopstore.config;

import org.akira.laptopstore.catalog.repository.BrandRepository;
import org.akira.laptopstore.catalog.repository.CategoryRepository;
import org.akira.laptopstore.catalog.repository.ProductRepository;
import org.akira.laptopstore.catalog.repository.ProductVariantRepository;
import org.akira.laptopstore.procurement.repository.SupplierRepository;
import org.akira.laptopstore.user.entity.Role;
import org.akira.laptopstore.user.entity.User;
import org.akira.laptopstore.user.repository.RoleRepository;
import org.akira.laptopstore.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DatabaseSeederTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private SupplierRepository supplierRepository;
    @Mock
    private BrandRepository brandRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductVariantRepository productVariantRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private DatabaseSeeder seeder;

    @BeforeEach
    void setUp() {
        seeder = new DatabaseSeeder(
                userRepository,
                roleRepository,
                passwordEncoder,
                supplierRepository,
                brandRepository,
                categoryRepository,
                productRepository,
                productVariantRepository
        );
        ReflectionTestUtils.setField(seeder, "seedDemoData", false);
    }

    @Test
    @DisplayName("Production bootstrap tạo tài khoản ADMIN mới theo ADMIN_BOOTSTRAP_EMAIL và ADMIN_BOOTSTRAP_PASSWORD")
    void productionBootstrap_createsAdminFromEnvWhenMissing() throws Exception {
        ReflectionTestUtils.setField(seeder, "adminBootstrapEmail", "admin123@gmail.com");
        ReflectionTestUtils.setField(seeder, "adminBootstrapPassword", "admin123");

        Role adminRole = Role.builder().id(1L).name("ROLE_ADMIN").build();
        when(userRepository.findByEmailIgnoreCase("kietadmin@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("admin123@gmail.com")).thenReturn(Optional.empty());
        when(roleRepository.findByName("ROLE_ADMIN")).thenReturn(Optional.of(adminRole));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        seeder.run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("admin123@gmail.com");
        assertThat(saved.getStatus()).isEqualTo("ACTIVE");
        assertThat(passwordEncoder.matches("admin123", saved.getPasswordHash())).isTrue();
        assertThat(saved.getRoles()).extracting(Role::getName).contains("ROLE_ADMIN");
    }

    @Test
    @DisplayName("Production bootstrap cập nhật mật khẩu, kích hoạt và cấp ROLE_ADMIN nếu user đã tồn tại")
    void productionBootstrap_updatesExistingUserPasswordAndRole() throws Exception {
        ReflectionTestUtils.setField(seeder, "adminBootstrapEmail", "admin123@gmail.com");
        ReflectionTestUtils.setField(seeder, "adminBootstrapPassword", "admin123");

        Role userRole = Role.builder().id(2L).name("ROLE_USER").build();
        Role adminRole = Role.builder().id(1L).name("ROLE_ADMIN").build();
        User existing = User.builder()
                .id(9L)
                .email("admin123@gmail.com")
                .passwordHash(passwordEncoder.encode("old-password"))
                .status("INACTIVE")
                .tokenVersion(1)
                .roles(new HashSet<>(Set.of(userRole)))
                .build();

        when(userRepository.findByEmailIgnoreCase("kietadmin@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("admin123@gmail.com")).thenReturn(Optional.of(existing));
        when(roleRepository.findByName("ROLE_ADMIN")).thenReturn(Optional.of(adminRole));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        seeder.run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo("ACTIVE");
        assertThat(saved.getTokenVersion()).isEqualTo(2);
        assertThat(passwordEncoder.matches("admin123", saved.getPasswordHash())).isTrue();
        assertThat(saved.getRoles()).extracting(Role::getName).contains("ROLE_ADMIN");
    }

    @Test
    @DisplayName("Production bootstrap bỏ qua tạo admin mới nếu ADMIN_BOOTSTRAP_EMAIL rỗng")
    void productionBootstrap_skipsBootstrapWhenEmailBlank() throws Exception {
        ReflectionTestUtils.setField(seeder, "adminBootstrapEmail", "   ");
        ReflectionTestUtils.setField(seeder, "adminBootstrapPassword", "admin123");
        when(userRepository.findByEmailIgnoreCase("kietadmin@gmail.com")).thenReturn(Optional.empty());

        seeder.run();

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Production bootstrap vẫn xoay mật khẩu mặc định không an toàn của kietadmin@gmail.com")
    void productionBootstrap_rotatesInsecureDemoAdmin() throws Exception {
        ReflectionTestUtils.setField(seeder, "adminBootstrapEmail", "");
        ReflectionTestUtils.setField(seeder, "adminBootstrapPassword", "StrongPass!2026");

        User demoAdmin = User.builder()
                .id(1L)
                .email("kietadmin@gmail.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .tokenVersion(0)
                .status("ACTIVE")
                .build();
        when(userRepository.findByEmailIgnoreCase("kietadmin@gmail.com")).thenReturn(Optional.of(demoAdmin));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        seeder.run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(passwordEncoder.matches("StrongPass!2026", captor.getValue().getPasswordHash())).isTrue();
        assertThat(captor.getValue().getTokenVersion()).isEqualTo(1);
    }
}
