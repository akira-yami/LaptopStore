package org.akira.laptopstore.user.service;

import org.akira.laptopstore.exception.BusinessException;
import org.akira.laptopstore.exception.ResourceNotFoundException;
import org.akira.laptopstore.exception.ValidationException;
import org.akira.laptopstore.user.dto.ChangeUserRolesRequest;
import org.akira.laptopstore.user.dto.ChangeUserStatusRequest;
import org.akira.laptopstore.user.dto.UpdateProfileRequest;
import org.akira.laptopstore.user.dto.UserProfileResponse;
import org.akira.laptopstore.user.entity.Role;
import org.akira.laptopstore.user.entity.User;
import org.akira.laptopstore.user.repository.RoleRepository;
import org.akira.laptopstore.user.repository.UserRepository;
import org.akira.laptopstore.user.service.impl.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @InjectMocks
    private UserServiceImpl userService;

    private Role userRole;
    private Role staffRole;
    private Role adminRole;
    private User actorAdmin;
    private User peerAdmin;
    private User sampleStaff;
    private User sampleUser;

    @BeforeEach
    void setUp() {
        userRole = Role.builder().id(1L).name("ROLE_USER").build();
        staffRole = Role.builder().id(2L).name("ROLE_STAFF").build();
        adminRole = Role.builder().id(3L).name("ROLE_ADMIN").build();

        actorAdmin = User.builder()
                .id(1L)
                .email("admin1@laptopstore.com")
                .fullName("Admin Mot")
                .status("ACTIVE")
                .tokenVersion(0)
                .roles(new HashSet<>(Set.of(adminRole)))
                .build();

        peerAdmin = User.builder()
                .id(2L)
                .email("admin2@laptopstore.com")
                .fullName("Admin Hai")
                .status("ACTIVE")
                .tokenVersion(0)
                .roles(new HashSet<>(Set.of(adminRole)))
                .build();

        sampleStaff = User.builder()
                .id(50L)
                .email("staff@laptopstore.com")
                .fullName("Nhan Vien")
                .status("ACTIVE")
                .tokenVersion(0)
                .roles(new HashSet<>(Set.of(staffRole)))
                .build();

        sampleUser = User.builder()
                .id(100L)
                .email("user100@laptopstore.com")
                .fullName("Nguyen Van A")
                .phone("0987654321")
                .status("ACTIVE")
                .tokenVersion(0)
                .roles(new HashSet<>(Set.of(userRole)))
                .build();
    }

    @Test
    @DisplayName("getProfile: Should return user profile when user exists")
    void getProfile_whenExists_shouldReturnProfile() {
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));

        UserProfileResponse response = userService.getProfile(100L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getEmail()).isEqualTo("user100@laptopstore.com");
        assertThat(response.getFullName()).isEqualTo("Nguyen Van A");
        assertThat(response.getRoles()).contains("ROLE_USER");
    }

    @Test
    @DisplayName("getProfile: Should throw ResourceNotFoundException when user does not exist")
    void getProfile_whenNotFound_shouldThrowException() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getProfile(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("User not found with id: 999");
    }

    @Test
    @DisplayName("updateProfile: Should update full name and phone and save")
    void updateProfile_shouldUpdateFields() {
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFullName("Nguyen Van B");
        request.setPhone("0912345678");

        UserProfileResponse response = userService.updateProfile(100L, request);

        assertThat(response.getFullName()).isEqualTo("Nguyen Van B");
        assertThat(response.getPhone()).isEqualTo("0912345678");
        verify(userRepository).save(sampleUser);
    }

    @Test
    @DisplayName("updateUserStatus: Admin updates lower-ranked user status successfully")
    void updateUserStatus_shouldUpdateStatus() {
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(actorAdmin));
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ChangeUserStatusRequest request = new ChangeUserStatusRequest();
        request.setStatus("SUSPENDED");

        UserProfileResponse response = userService.updateUserStatus(1L, 100L, request);

        assertThat(response.getStatus()).isEqualTo("SUSPENDED");
        verify(userRepository).save(sampleUser);
    }

    @Test
    @DisplayName("updateUserRoles: Chặn Admin tự thay đổi hoặc tự phế truất vai trò của chính mình")
    void updateUserRoles_whenSelf_shouldThrowForbidden() {
        ChangeUserRolesRequest request = rolesRequest("ROLE_USER");

        assertThatThrownBy(() -> userService.updateUserRoles(1L, 1L, request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateUserRoles: Chặn Admin phế truất hoặc chỉnh role của Admin khác ngang cấp")
    void updateUserRoles_whenTargetIsPeerAdmin_shouldThrowForbidden() {
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(actorAdmin));
        when(userRepository.findById(2L)).thenReturn(Optional.of(peerAdmin));

        ChangeUserRolesRequest request = rolesRequest("ROLE_USER");

        assertThatThrownBy(() -> userService.updateUserRoles(1L, 2L, request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateUserRoles: Chặn role thấp hơn hoặc ngang cấp (STAFF) sửa vai trò của STAFF khác hoặc ADMIN")
    void updateUserRoles_whenActorIsLowerOrEqualStaff_shouldThrowForbidden() {
        User otherStaff = User.builder()
                .id(51L)
                .email("staff2@laptopstore.com")
                .status("ACTIVE")
                .roles(new HashSet<>(Set.of(staffRole)))
                .build();
        lenient().when(userRepository.findById(50L)).thenReturn(Optional.of(sampleStaff));
        when(userRepository.findById(51L)).thenReturn(Optional.of(otherStaff));

        assertThatThrownBy(() -> userService.updateUserRoles(50L, 51L, rolesRequest("ROLE_USER")))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateUserRoles: Chặn gán role lạ không hợp lệ và không tự tạo role mới trong DB")
    void updateUserRoles_whenUnknownRoleName_shouldThrowValidationAndNotCreateRole() {
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(actorAdmin));
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));

        assertThatThrownBy(() -> userService.updateUserRoles(1L, 100L, rolesRequest("ROLE_HACKER")))
                .isInstanceOf(ValidationException.class);

        verify(roleRepository, never()).save(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateUserRoles: Admin hợp lệ phân quyền cho User/Staff cấp dưới thành công")
    void updateUserRoles_whenTargetLowerRank_shouldUpdateSuccessfully() {
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(actorAdmin));
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(roleRepository.findByName("ROLE_USER")).thenReturn(Optional.of(userRole));
        when(roleRepository.findByName("ROLE_STAFF")).thenReturn(Optional.of(staffRole));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserProfileResponse response = userService.updateUserRoles(1L, 100L, rolesRequest("ROLE_USER", "ROLE_STAFF"));

        assertThat(response.getRoles()).containsExactlyInAnyOrder("ROLE_USER", "ROLE_STAFF");
        assertThat(sampleUser.getTokenVersion()).isEqualTo(1);
        verify(userRepository).save(sampleUser);
    }

    @Test
    @DisplayName("updateUserStatus: Chặn Admin tự khóa chính mình")
    void updateUserStatus_whenSelf_shouldThrowForbidden() {
        ChangeUserStatusRequest request = new ChangeUserStatusRequest();
        request.setStatus("LOCKED");

        assertThatThrownBy(() -> userService.updateUserStatus(1L, 1L, request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateUserStatus: Chặn Admin khóa tài khoản Admin khác ngang cấp")
    void updateUserStatus_whenTargetIsPeerAdmin_shouldThrowForbidden() {
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(actorAdmin));
        when(userRepository.findById(2L)).thenReturn(Optional.of(peerAdmin));

        ChangeUserStatusRequest request = new ChangeUserStatusRequest();
        request.setStatus("LOCKED");

        assertThatThrownBy(() -> userService.updateUserStatus(1L, 2L, request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateUserStatus: Chặn role thấp hơn khóa tài khoản có role cao hơn")
    void updateUserStatus_whenActorIsLowerThanTarget_shouldThrowForbidden() {
        lenient().when(userRepository.findById(50L)).thenReturn(Optional.of(sampleStaff));
        when(userRepository.findById(2L)).thenReturn(Optional.of(peerAdmin));

        ChangeUserStatusRequest request = new ChangeUserStatusRequest();
        request.setStatus("LOCKED");

        assertThatThrownBy(() -> userService.updateUserStatus(50L, 2L, request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateUserRoles: Chặn role thấp hơn (STAFF) phong vai trò cao hơn mình (ROLE_ADMIN)")
    void updateUserRoles_whenAssigningRoleHigherThanActor_shouldThrowForbidden() {
        lenient().when(userRepository.findById(50L)).thenReturn(Optional.of(sampleStaff));
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));

        assertThatThrownBy(() -> userService.updateUserRoles(50L, 100L, rolesRequest("ROLE_ADMIN")))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(userRepository, never()).save(any());
    }

    private ChangeUserRolesRequest rolesRequest(String... roleNames) {
        ChangeUserRolesRequest request = new ChangeUserRolesRequest();
        request.setRoles(Set.of(roleNames));
        return request;
    }
}
