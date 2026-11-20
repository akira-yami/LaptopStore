package org.akira.laptopstore.payment.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.akira.laptopstore.order.dto.response.OrderPageResponse;
import org.akira.laptopstore.payment.dto.request.ReviewRefundRequest;
import org.akira.laptopstore.payment.dto.response.RefundRequestResponse;
import org.akira.laptopstore.payment.enums.RefundRequestStatus;
import org.akira.laptopstore.payment.service.RefundRequestService;
import org.akira.laptopstore.payment.service.RefundRequestService.EvidenceFile;
import org.akira.laptopstore.security.principal.CustomUserDetails;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class RefundRequestController {
    private final RefundRequestService refundService;

    @GetMapping("/me/orders/{orderId}/refund-request")
    public ResponseEntity<RefundRequestResponse> getLatest(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable Long orderId) {
        return refundService.getLatestOwnRequest(user.getId(), orderId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping(value = "/me/orders/{orderId}/refund-request", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RefundRequestResponse> submit(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable Long orderId,
            @RequestParam String reason, @RequestParam(required = false) List<MultipartFile> images) {
        return ResponseEntity.status(HttpStatus.CREATED).body(refundService.submit(user.getId(), orderId, reason, images));
    }

    @GetMapping("/me/refund-requests/{requestId}/evidence/{evidenceId}")
    public ResponseEntity<byte[]> ownEvidence(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable Long requestId, @PathVariable Long evidenceId) {
        return imageResponse(refundService.getOwnEvidence(user.getId(), requestId, evidenceId));
    }

    @GetMapping("/admin/refund-requests")
    @PreAuthorize("hasRole('ADMIN')")
    public OrderPageResponse<RefundRequestResponse> list(
            @RequestParam(required = false) RefundRequestStatus status,
            @RequestParam(required = false) List<Long> orderIds,
            @PageableDefault(size = 20) Pageable pageable) {
        var newestFirst = PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), 100),
                Sort.Direction.DESC, "id");
        return OrderPageResponse.from(refundService.list(status, orderIds, newestFirst));
    }

    @PutMapping("/admin/refund-requests/{requestId}/decision")
    @PreAuthorize("hasRole('ADMIN')")
    public RefundRequestResponse review(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable Long requestId,
            @Valid @RequestBody ReviewRefundRequest request) {
        return refundService.review(user.getId(), requestId, request.approved(),
                Boolean.TRUE.equals(request.returnOrder()), request.note());
    }

    @GetMapping("/admin/refund-requests/{requestId}/evidence/{evidenceId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> evidence(@PathVariable Long requestId, @PathVariable Long evidenceId) {
        return imageResponse(refundService.getEvidence(requestId, evidenceId));
    }

    private ResponseEntity<byte[]> imageResponse(EvidenceFile image) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .cacheControl(CacheControl.noStore())
                .body(image.content());
    }
}
