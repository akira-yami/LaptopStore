package org.akira.laptopstore.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.akira.laptopstore.security.principal.CustomUserDetails;
import org.akira.laptopstore.user.dto.ChangeUserRolesRequest;
import org.akira.laptopstore.user.dto.ChangeUserStatusRequest;
import org.akira.laptopstore.user.dto.UserProfileResponse;
import org.akira.laptopstore.user.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserProfileResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<UserProfileResponse> updateUserStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody ChangeUserStatusRequest request
    ) {
        return ResponseEntity.ok(userService.updateUserStatus(userDetails.getId(), id, request));
    }

    @PatchMapping("/{id}/roles")
    public ResponseEntity<UserProfileResponse> updateUserRoles(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody ChangeUserRolesRequest request
    ) {
        return ResponseEntity.ok(userService.updateUserRoles(userDetails.getId(), id, request));
    }
}
