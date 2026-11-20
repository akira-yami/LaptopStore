package org.akira.laptopstore.payment.service.Impl;

import lombok.RequiredArgsConstructor;
import org.akira.laptopstore.exception.BusinessException;
import org.akira.laptopstore.exception.ResourceNotFoundException;
import org.akira.laptopstore.exception.ValidationException;
import org.akira.laptopstore.order.entity.enums.OrderStatus;
import org.akira.laptopstore.order.service.OrderQueryService;
import org.akira.laptopstore.order.service.OrderRefundService;
import org.akira.laptopstore.payment.dto.response.RefundRequestResponse;
import org.akira.laptopstore.payment.entity.RefundRequest;
import org.akira.laptopstore.payment.entity.RefundRequestEvidence;
import org.akira.laptopstore.payment.enums.PaymentStatus;
import org.akira.laptopstore.payment.enums.RefundRequestStatus;
import org.akira.laptopstore.payment.repository.PaymentRepository;
import org.akira.laptopstore.payment.repository.RefundRequestEvidenceRepository;
import org.akira.laptopstore.payment.repository.RefundRequestRepository;
import org.akira.laptopstore.payment.service.RefundRequestService;
import org.akira.laptopstore.payment.service.StoreCreditService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RefundRequestServiceImpl implements RefundRequestService {
    private static final int MAX_IMAGES = 3;
    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;
    private static final long MAX_IMAGE_PIXELS = 20_000_000;
    private static final List<RefundRequestStatus> BLOCKING_STATUSES =
            List.of(RefundRequestStatus.PENDING, RefundRequestStatus.APPROVED);

    private final OrderQueryService orderQueryService;
    private final OrderRefundService orderRefundService;
    private final PaymentRepository paymentRepository;
    private final RefundRequestRepository refundRepository;
    private final RefundRequestEvidenceRepository evidenceRepository;
    private final StoreCreditService storeCreditService;

    @Override
    @Transactional(readOnly = true)
    public Optional<RefundRequestResponse> getLatestOwnRequest(Long userId, Long orderId) {
        orderQueryService.validateOrderOwner(orderId, userId);
        return refundRepository.findFirstByOrderIdOrderByIdDesc(orderId).map(this::toResponse);
    }

    @Override
    @Transactional
    public RefundRequestResponse submit(Long userId, Long orderId, String reason, List<MultipartFile> images) {
        orderQueryService.validateOrderOwner(orderId, userId);
        String normalizedReason = reason == null ? "" : reason.strip();
        if (normalizedReason.isEmpty() || normalizedReason.length() > 1000) {
            throw new ValidationException("Lý do hoàn tiền phải có từ 1 đến 1.000 ký tự");
        }
        List<MultipartFile> files = images == null ? List.of() : images;
        if (files.size() > MAX_IMAGES) {
            throw new ValidationException("Chỉ được đính kèm tối đa 3 ảnh minh chứng");
        }

        var payment = paymentRepository.findByOrderIdForUpdate(orderId)
                .filter(p -> p.getStatus() == PaymentStatus.PAID)
                .orElseThrow(() -> new BusinessException(HttpStatus.CONFLICT, "ORDER_NOT_PAID",
                        "Chỉ có thể yêu cầu hoàn tiền cho đơn đã thanh toán"));
        if (refundRepository.existsByOrderIdAndStatusIn(orderId, BLOCKING_STATUSES)) {
            throw new BusinessException(HttpStatus.CONFLICT, "REFUND_REQUEST_EXISTS",
                    "Đơn hàng đã có yêu cầu hoàn tiền đang chờ duyệt hoặc đã được duyệt");
        }

        List<EvidenceFile> evidence = files.stream().map(this::readImage).toList();
        var refund = refundRepository.save(RefundRequest.builder()
                .orderId(orderId)
                .amount(payment.getAmount())
                .reason(normalizedReason)
                .status(RefundRequestStatus.PENDING)
                .createdAt(Instant.now())
                .build());
        var savedImages = evidenceRepository.saveAll(evidence.stream()
                .map(file -> RefundRequestEvidence.builder()
                        .refundRequestId(refund.getId())
                        .contentType(file.contentType())
                        .content(file.content())
                        .build())
                .toList());
        return toResponse(refund, getOrderStatus(orderId), savedImages.stream().map(RefundRequestEvidence::getId).toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RefundRequestResponse> list(RefundRequestStatus status, List<Long> orderIds, Pageable pageable) {
        if (orderIds != null && orderIds.isEmpty()) {
            return Page.empty(pageable);
        }
        var refunds = orderIds != null ? refundRepository.findForOrders(orderIds, status, pageable)
                : status == null ? refundRepository.findAll(pageable) : refundRepository.findByStatus(status, pageable);
        if (refunds.isEmpty()) {
            return refunds.map(refund -> toResponse(refund, null, List.of()));
        }
        var orderStatuses = orderQueryService.getOrderStatuses(
                refunds.getContent().stream().map(RefundRequest::getOrderId).distinct().toList());
        var ids = refunds.getContent().stream().map(RefundRequest::getId).toList();
        var evidenceByRequest = evidenceRepository.findEvidenceIds(ids).stream().collect(Collectors.groupingBy(
                RefundRequestEvidenceRepository.EvidenceId::getRefundRequestId,
                Collectors.mapping(RefundRequestEvidenceRepository.EvidenceId::getId, Collectors.toList())));
        return refunds.map(refund -> toResponse(refund, orderStatuses.get(refund.getOrderId()),
                evidenceByRequest.getOrDefault(refund.getId(), List.of())));
    }

    @Override
    @Transactional
    public RefundRequestResponse review(Long adminId, Long requestId, boolean approved, boolean returnOrder, String note) {
        if (returnOrder && !approved) {
            throw new ValidationException("Chọn chấp nhận yêu cầu để xác nhận trả hàng");
        }
        var refund = refundRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu hoàn tiền"));
        var decision = approved ? RefundRequestStatus.APPROVED : RefundRequestStatus.REJECTED;
        if (refund.getStatus() == decision) {
            return toResponse(refund);
        }
        if (refund.getStatus() != RefundRequestStatus.PENDING) {
            throw new BusinessException(HttpStatus.CONFLICT, "REFUND_REQUEST_REVIEWED",
                    "Yêu cầu hoàn tiền đã được xử lý");
        }
        String normalizedNote = note == null ? "" : note.strip();
        if (normalizedNote.length() > 1000 || (!approved && normalizedNote.isEmpty())) {
            throw new ValidationException("Vui lòng nhập lý do từ chối. Ghi chú tối đa 1.000 ký tự");
        }
        if (approved) {
            Long userId = orderRefundService.confirmRefund(refund.getOrderId(), adminId, refund.getId(), returnOrder);
            storeCreditService.creditRefund(userId, refund.getOrderId(), refund.getId(), refund.getAmount());
            refund.setCreditedToStoreCredit(true);
        }
        refund.setStatus(decision);
        refund.setReviewedByUserId(adminId);
        refund.setReviewedAt(Instant.now());
        refund.setReviewNote(normalizedNote.isEmpty() ? null : normalizedNote);
        return toResponse(refund);
    }

    @Override
    @Transactional(readOnly = true)
    public EvidenceFile getOwnEvidence(Long userId, Long requestId, Long evidenceId) {
        var refund = refundRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ảnh minh chứng"));
        orderQueryService.validateOrderOwner(refund.getOrderId(), userId);
        return getEvidence(requestId, evidenceId);
    }

    @Override
    @Transactional(readOnly = true)
    public EvidenceFile getEvidence(Long requestId, Long evidenceId) {
        var evidence = evidenceRepository.findByIdAndRefundRequestId(evidenceId, requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ảnh minh chứng"));
        return new EvidenceFile(evidence.getContentType(), evidence.getContent());
    }

    private RefundRequestResponse toResponse(RefundRequest refund) {
        var evidenceIds = evidenceRepository.findEvidenceIds(List.of(refund.getId())).stream()
                .map(RefundRequestEvidenceRepository.EvidenceId::getId)
                .toList();
        return toResponse(refund, getOrderStatus(refund.getOrderId()), evidenceIds);
    }

    private OrderStatus getOrderStatus(Long orderId) {
        return orderQueryService.getOrderStatuses(List.of(orderId)).get(orderId);
    }

    private RefundRequestResponse toResponse(RefundRequest refund, OrderStatus orderStatus, List<Long> evidenceIds) {
        return new RefundRequestResponse(refund.getId(), refund.getOrderId(), orderStatus, refund.getAmount(), refund.getReason(),
                refund.getStatus(), refund.getCreatedAt(), refund.getReviewedAt(), refund.getReviewedByUserId(),
                refund.getReviewNote(), refund.isCreditedToStoreCredit(), evidenceIds);
    }

    private EvidenceFile readImage(MultipartFile file) {
        if (file.isEmpty() || file.getSize() > MAX_IMAGE_BYTES) {
            throw new ValidationException("Mỗi ảnh minh chứng phải có dung lượng tối đa 5 MB");
        }
        try (var stream = file.getInputStream(); var input = new MemoryCacheImageInputStream(stream)) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new ValidationException("Ảnh minh chứng phải là JPEG hoặc PNG hợp lệ");
            }
            var reader = readers.next();
            try {
                String contentType = switch (reader.getFormatName().toLowerCase(Locale.ROOT)) {
                    case "jpeg" -> "image/jpeg";
                    case "png" -> "image/png";
                    default -> throw new ValidationException("Ảnh minh chứng phải là JPEG hoặc PNG hợp lệ");
                };
                reader.setInput(input, true, true);
                if ((long) reader.getWidth(0) * reader.getHeight(0) > MAX_IMAGE_PIXELS) {
                    throw new ValidationException("Ảnh minh chứng vượt quá 20 triệu điểm ảnh");
                }
                reader.read(0);
                return new EvidenceFile(contentType, file.getBytes());
            } finally {
                reader.dispose();
            }
        } catch (IOException ex) {
            throw new ValidationException("Không đọc được ảnh minh chứng");
        }
    }
}
