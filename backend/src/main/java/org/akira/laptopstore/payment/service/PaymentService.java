package org.akira.laptopstore.payment.service;

import org.akira.laptopstore.payment.dto.request.RecordCodPaymentRequest;
import org.akira.laptopstore.payment.dto.request.StartPaymentRequest;
import org.akira.laptopstore.payment.dto.response.PaymentResponse;
import org.akira.laptopstore.payment.dto.response.PaymentSessionResponse;
import org.akira.laptopstore.payment.entity.Payment;

import java.util.Collection;
import java.util.List;

public interface PaymentService {

    /**
     * Khởi tạo một Payment cho đơn hàng.
     * Kiểm tra đơn thuộc về user, đơn còn có thể thanh toán
     * và mỗi đơn chỉ được tạo một Payment.
     * Payment mới có trạng thái PENDING.
     */
    PaymentResponse startPayment(Long userId, StartPaymentRequest request);

    PaymentResponse getById(Long userId, Long id);

    /**
     * Lấy thông tin Payment theo orderId.
     * Dùng khi cần kiểm tra trạng thái thanh toán của một đơn hàng.
     */
    PaymentResponse getByOrderId(Long userId, Long orderId);

    /**
     * Tra cứu hàng loạt trạng thái thanh toán theo danh sách orderId cho nhân viên/quản trị viên
     * để tránh hiển thị nhầm nút "Thu tiền COD" trên đơn VNPay hoặc đơn đã thu tiền.
     */
    List<PaymentResponse> getByOrderIdsForStaff(Collection<Long> orderIds);

    /**
     * Xác nhận thanh toán COD sau khi đơn hàng đã được giao.
     * Chỉ áp dụng cho Payment có method = COD và status = PENDING.
     * Sau khi xác nhận, Payment chuyển sang PAID.
     */
    PaymentResponse recordCodPayment(RecordCodPaymentRequest request);

    /**
     * Tạo phiên thanh toán VNPay.
     * Tạo PaymentTransaction ở trạng thái PENDING,
     * sinh mã tham chiếu giao dịch và URL để chuyển người dùng sang VNPay.
     */
    PaymentSessionResponse createVnpaySession(Long userId, Long paymentId, String clientIp);

    /**
     * Quét các Payment online đã quá thời hạn thanh toán.
     *
     * PENDING -> FAILED
     *
     * @return số payment đã hết hạn
     */
    int expirePendingPayments();
}
