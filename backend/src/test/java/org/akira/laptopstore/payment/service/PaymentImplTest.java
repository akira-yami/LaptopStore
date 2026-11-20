package org.akira.laptopstore.payment.service;

import org.akira.laptopstore.common.exception.PaymentAlreadyExistsException;
import org.akira.laptopstore.order.service.OrderQueryService;
import org.akira.laptopstore.payment.dto.request.StartPaymentRequest;
import org.akira.laptopstore.payment.entity.Payment;
import org.akira.laptopstore.payment.enums.PaymentMethod;
import org.akira.laptopstore.payment.enums.PaymentStatus;
import org.akira.laptopstore.payment.integration.VnPayGateway;
import org.akira.laptopstore.payment.repository.PaymentRepository;
import org.akira.laptopstore.payment.repository.PaymentTransactionRepository;
import org.akira.laptopstore.payment.service.Impl.PaymentImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentImplTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private OrderQueryService orderQueryService;
    @Mock private PaymentTransactionService paymentTransactionService;
    @Mock private PaymentTransactionRepository paymentTransactionRepository;
    @Mock private VnPayGateway vnPayGateway;

    @InjectMocks private PaymentImpl paymentService;

    @Test
    void startPaymentReturnsExistingPendingPaymentIdempotentlyWhenMethodMatches() {
        Payment existing = Payment.builder()
                .id(30L)
                .orderId(125L)
                .method(PaymentMethod.COD)
                .amount(new BigDecimal("20000000"))
                .status(PaymentStatus.PENDING)
                .createdAt(Instant.now())
                .build();
        lenient().when(paymentRepository.existsByOrderId(125L)).thenReturn(true);
        lenient().when(paymentRepository.findByOrderId(125L)).thenReturn(Optional.of(existing));

        StartPaymentRequest request = new StartPaymentRequest();
        request.setOrderId(125L);
        request.setMethod(PaymentMethod.COD);

        var response = paymentService.startPayment(42L, request);

        assertEquals(30L, response.getId());
        assertEquals(PaymentMethod.COD, response.getMethod());
        assertEquals(PaymentStatus.PENDING, response.getStatus());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void startPaymentThrowsWhenExistingPaymentHasDifferentMethodOrNonPendingStatus() {
        Payment paid = Payment.builder()
                .id(31L)
                .orderId(126L)
                .method(PaymentMethod.VNPAY)
                .amount(new BigDecimal("20000000"))
                .status(PaymentStatus.PAID)
                .createdAt(Instant.now())
                .build();
        lenient().when(paymentRepository.existsByOrderId(126L)).thenReturn(true);
        lenient().when(paymentRepository.findByOrderId(126L)).thenReturn(Optional.of(paid));

        StartPaymentRequest request = new StartPaymentRequest();
        request.setOrderId(126L);
        request.setMethod(PaymentMethod.VNPAY);

        assertThrows(PaymentAlreadyExistsException.class, () -> paymentService.startPayment(42L, request));
    }

    @Test
    void getByOrderIdsForStaffReturnsMatchingPaymentsAndEmptyForEmptyInput() {
        assertTrue(paymentService.getByOrderIdsForStaff(List.of()).isEmpty());
        assertTrue(paymentService.getByOrderIdsForStaff(null).isEmpty());

        Payment cod = Payment.builder().id(1L).orderId(10L).method(PaymentMethod.COD).status(PaymentStatus.PENDING).amount(BigDecimal.TEN).build();
        Payment vnpay = Payment.builder().id(2L).orderId(11L).method(PaymentMethod.VNPAY).status(PaymentStatus.PAID).amount(BigDecimal.TEN).build();
        when(paymentRepository.findByOrderIdIn(List.of(10L, 11L))).thenReturn(List.of(cod, vnpay));

        var result = paymentService.getByOrderIdsForStaff(List.of(10L, 11L));

        assertEquals(2, result.size());
        assertEquals(PaymentMethod.COD, result.get(0).getMethod());
        assertEquals(PaymentStatus.PAID, result.get(1).getStatus());
    }
}
