package org.akira.laptopstore.payment.service;

import org.akira.laptopstore.payment.dto.response.RefundRequestResponse;
import org.akira.laptopstore.payment.enums.RefundRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

public interface RefundRequestService {
    // Xem yêu cầu mới cập nhật của 1 đơn hàng
    Optional<RefundRequestResponse> getLatestOwnRequest(Long userId, Long orderId);

    // Gửi yêu cầu hoàn tiền
    RefundRequestResponse submit(Long userId, Long orderId, String reason, List<MultipartFile> images);

    // Lấy danh sách yêu cầu hoàn tiền có phân trang
    Page<RefundRequestResponse> list(RefundRequestStatus status, List<Long> orderIds, Pageable pageable);

    // Duyệt hoặc từ chối yêu cầu hoàn tiền
    RefundRequestResponse review(Long adminId, Long requestId, boolean approved, boolean returnOrder, String note);
    
    // Xem ảnh minh chứng thuộc yêu cầu của mình
    EvidenceFile getOwnEvidence(Long userId, Long requestId, Long evidenceId);

    // Xem ảnh minh chứng của yêu cầu hoàn tiền
    EvidenceFile getEvidence(Long requestId, Long evidenceId);

    record EvidenceFile(String contentType, byte[] content) {}
}
