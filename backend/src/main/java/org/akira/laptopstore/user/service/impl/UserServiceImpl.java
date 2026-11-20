package org.akira.laptopstore.user.service.impl;

import lombok.RequiredArgsConstructor;
import org.akira.laptopstore.exception.BusinessException;
import org.akira.laptopstore.exception.ResourceNotFoundException;
import org.akira.laptopstore.exception.UnauthenticatedException;
import org.akira.laptopstore.exception.ValidationException;
import org.akira.laptopstore.user.dto.ChangeUserRolesRequest;
import org.akira.laptopstore.user.dto.ChangeUserStatusRequest;
import org.akira.laptopstore.user.dto.UpdateProfileRequest;
import org.akira.laptopstore.user.dto.UserProfileResponse;
import org.akira.laptopstore.user.entity.Role;
import org.akira.laptopstore.user.entity.User;
import org.akira.laptopstore.user.repository.RoleRepository;
import org.akira.laptopstore.user.repository.UserRepository;
import org.akira.laptopstore.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private static final Map<String, Integer> ROLE_HIERARCHY = Map.of(
            "ROLE_USER", 1,
            "ROLE_STAFF", 2,
            "ROLE_ADMIN", 3
    );

    private static final Set<String> ALLOWED_STATUSES = Set.of("ACTIVE", "LOCKED", "SUSPENDED");

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(Long userId) {
        User user = findUserOrThrow(userId);
        return toProfileResponse(user);
    }

    @Override
    @Transactional
    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = findUserOrThrow(userId);

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }

        User updated = userRepository.save(user);
        return toProfileResponse(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserProfileResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toProfileResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserProfileResponse updateUserStatus(Long actorId, Long userId, ChangeUserStatusRequest request) {
        if (request == null || request.getStatus() == null || request.getStatus().isBlank()) {
            throw new ValidationException("Trạng thái tài khoản không được để trống");
        }
        String normalizedStatus = request.getStatus().trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_STATUSES.contains(normalizedStatus)) {
            throw new ValidationException("Trạng thái tài khoản không hợp lệ: " + normalizedStatus);
        }

        UserManagementContext ctx = authorizeTargetManagement(
                actorId,
                userId,
                "Không thể tự thay đổi trạng thái tài khoản của chính mình",
                "Role ngang cấp hoặc thấp hơn không có quyền khóa/thay đổi trạng thái tài khoản này"
        );

        ctx.target().setStatus(normalizedStatus);
        // Invalidate tokens immediately if user is disabled or locked
        ctx.target().setTokenVersion(ctx.target().getTokenVersion() + 1);

        User updated = userRepository.save(ctx.target());
        return toProfileResponse(updated);
    }

    @Override
    @Transactional
    public UserProfileResponse updateUserRoles(Long actorId, Long userId, ChangeUserRolesRequest request) {
        if (request == null || request.getRoles() == null || request.getRoles().isEmpty()) {
            throw new ValidationException("Danh sách vai trò không được để trống");
        }

        UserManagementContext ctx = authorizeTargetManagement(
                actorId,
                userId,
                "Không thể tự thay đổi hoặc tự hạ quyền của chính mình",
                "Role ngang cấp hoặc thấp hơn không có quyền phân quyền hoặc phế truất tài khoản này"
        );

        Set<String> normalizedRoles = normalizeAndValidateRequestedRoles(request.getRoles(), ctx.actorMaxRank());

        Set<Role> roles = new HashSet<>();
        for (String roleName : normalizedRoles) {
            Role role = roleRepository.findByName(roleName)
                    .orElseThrow(() -> new ResourceNotFoundException("Role not found with name: " + roleName));
            roles.add(role);
        }

        ctx.target().setRoles(roles);
        // Invalidate previous tokens so new role takes effect immediately
        ctx.target().setTokenVersion(ctx.target().getTokenVersion() + 1);

        User updated = userRepository.save(ctx.target());
        return toProfileResponse(updated);
    }

    private UserManagementContext authorizeTargetManagement(
            Long actorId,
            Long targetUserId,
            String selfActionMessage,
            String hierarchyViolationMessage
    ) {
        if (actorId == null || actorId <= 0) {
            throw new UnauthenticatedException("Vui lòng đăng nhập để thực hiện thao tác quản trị");
        }
        if (targetUserId == null || targetUserId <= 0) {
            throw new ValidationException("ID người dùng không hợp lệ");
        }
        if (actorId.equals(targetUserId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN_ROLE_OPERATION", selfActionMessage);
        }

        User actor = findUserOrThrow(actorId);
        User target = findUserOrThrow(targetUserId);

        int actorMaxRank = getMaxRoleRank(actor.getRoles());
        int targetMaxRank = getMaxRoleRank(target.getRoles());

        // Chỉ tài khoản có vai trò cao hơn hẳn mới được thao tác trên tài khoản đích.
        if (actorMaxRank <= 0 || targetMaxRank >= actorMaxRank) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN_ROLE_OPERATION", hierarchyViolationMessage);
        }

        return new UserManagementContext(actor, target, actorMaxRank);
    }

    private Set<String> normalizeAndValidateRequestedRoles(Set<String> rawRoles, int actorMaxRank) {
        Set<String> normalized = new HashSet<>();
        for (String rawRole : rawRoles) {
            if (rawRole == null || rawRole.isBlank()) {
                throw new ValidationException("Tên vai trò không được để trống");
            }
            String roleName = rawRole.trim().toUpperCase(Locale.ROOT);
            Integer rank = ROLE_HIERARCHY.get(roleName);
            if (rank == null) {
                throw new ValidationException("Vai trò không hợp lệ: " + roleName);
            }
            if (rank > actorMaxRank) {
                throw new BusinessException(
                        HttpStatus.FORBIDDEN,
                        "FORBIDDEN_ROLE_OPERATION",
                        "Không có quyền gán vai trò cao hơn quyền hiện tại của bạn"
                );
            }
            normalized.add(roleName);
        }
        return normalized;
    }

    private int getMaxRoleRank(Set<Role> roles) {
        if (roles == null || roles.isEmpty()) {
            return 0;
        }
        return roles.stream()
                .map(Role::getName)
                .filter(name -> name != null && !name.isBlank())
                .map(name -> name.trim().toUpperCase(Locale.ROOT))
                .mapToInt(name -> ROLE_HIERARCHY.getOrDefault(name, Integer.MAX_VALUE))
                .max()
                .orElse(0);
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
    }

    private UserProfileResponse toProfileResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .status(user.getStatus())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()))
                .createdAt(user.getCreatedAt())
                .build();
    }

    private record UserManagementContext(User actor, User target, int actorMaxRank) {
    }
}
