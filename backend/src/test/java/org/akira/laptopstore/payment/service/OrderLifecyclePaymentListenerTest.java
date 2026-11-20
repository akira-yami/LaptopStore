package org.akira.laptopstore.payment.service;

import org.akira.laptopstore.order.entity.enums.CheckoutPaymentMethod;
import org.akira.laptopstore.order.event.OrderCancelledEvent;
import org.akira.laptopstore.order.event.OrderCreatedEvent;
import org.akira.laptopstore.payment.entity.Payment;
import org.akira.laptopstore.payment.enums.PaymentMethod;
import org.akira.laptopstore.payment.enums.PaymentStatus;
import org.akira.laptopstore.payment.repository.PaymentRepository;
import org.akira.laptopstore.payment.service.Impl.OrderLifecyclePaymentListener;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderLifecyclePaymentListenerTest {

    @Mock private PaymentRepository paymentRepository;
    @InjectMocks private OrderLifecyclePaymentListener listener;

    @Test
    void onOrderCreatedCreatesPendingCodPaymentWithoutExpiresAt() {
        when(paymentRepository.existsByOrderId(100L)).thenReturn(false);

        listener.onOrderCreated(new OrderCreatedEvent(
                100L, 42L, CheckoutPaymentMethod.COD, new BigDecimal("25000000"), Instant.parse("2026-11-20T10:00:00Z")
        ));

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        Payment saved = captor.getValue();
        assertEquals(100L, saved.getOrderId());
        assertEquals(PaymentMethod.COD, saved.getMethod());
        assertEquals(PaymentStatus.PENDING, saved.getStatus());
        assertEquals(new BigDecimal("25000000"), saved.getAmount());
        assertNull(saved.getExpiresAt());
    }

    @Test
    void onOrderCreatedCreatesPendingVnpayPaymentWith15MinuteDeadline() {
        Instant createdAt = Instant.parse("2026-11-20T10:00:00Z");
        when(paymentRepository.existsByOrderId(101L)).thenReturn(false);

        listener.onOrderCreated(new OrderCreatedEvent(
                101L, 42L, CheckoutPaymentMethod.VNPAY, new BigDecimal("30000000"), createdAt
        ));

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        Payment saved = captor.getValue();
        assertEquals(PaymentMethod.VNPAY, saved.getMethod());
        assertEquals(createdAt.plusSeconds(900), saved.getExpiresAt());
    }

    @Test
    void onOrderCreatedIsIdempotentWhenPaymentAlreadyExists() {
        when(paymentRepository.existsByOrderId(102L)).thenReturn(true);

        listener.onOrderCreated(new OrderCreatedEvent(
                102L, 42L, CheckoutPaymentMethod.COD, new BigDecimal("10000000"), Instant.now()
        ));

        verify(paymentRepository, never()).save(any());
    }

    @Test
    void onOrderCancelledMarksPendingPaymentAsCancelled() {
        Payment pending = Payment.builder().id(1L).orderId(200L).method(PaymentMethod.VNPAY).status(PaymentStatus.PENDING).build();
        when(paymentRepository.findByOrderIdForUpdate(200L)).thenReturn(Optional.of(pending));

        listener.onOrderCancelled(new OrderCancelledEvent(200L, false));

        assertEquals(PaymentStatus.CANCELLED, pending.getStatus());
        verify(paymentRepository).save(pending);
    }

    @Test
    void onOrderExpiredMarksPendingPaymentAsFailed() {
        Payment pending = Payment.builder().id(2L).orderId(201L).method(PaymentMethod.VNPAY).status(PaymentStatus.PENDING).build();
        when(paymentRepository.findByOrderIdForUpdate(201L)).thenReturn(Optional.of(pending));

        listener.onOrderCancelled(new OrderCancelledEvent(201L, true));

        assertEquals(PaymentStatus.FAILED, pending.getStatus());
        verify(paymentRepository).save(pending);
    }

    @Test
    void onOrderCancelledDoesNotOverwriteAlreadyPaidPayment() {
        Payment paid = Payment.builder().id(3L).orderId(202L).method(PaymentMethod.VNPAY).status(PaymentStatus.PAID).build();
        when(paymentRepository.findByOrderIdForUpdate(202L)).thenReturn(Optional.of(paid));

        listener.onOrderCancelled(new OrderCancelledEvent(202L, false));

        assertEquals(PaymentStatus.PAID, paid.getStatus());
        verify(paymentRepository, never()).save(any());
    }
}
