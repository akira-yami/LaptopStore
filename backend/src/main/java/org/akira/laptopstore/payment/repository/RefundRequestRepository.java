package org.akira.laptopstore.payment.repository;

import jakarta.persistence.LockModeType;
import org.akira.laptopstore.payment.entity.RefundRequest;
import org.akira.laptopstore.payment.enums.RefundRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;

public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {
    Optional<RefundRequest> findFirstByOrderIdOrderByIdDesc(Long orderId);

    boolean existsByOrderIdAndStatusIn(Long orderId, Collection<RefundRequestStatus> statuses);

    Page<RefundRequest> findByStatus(RefundRequestStatus status, Pageable pageable);

    @Query("""
            select r from RefundRequest r
            where r.orderId in :orderIds and (:status is null or r.status = :status)
            """)
    Page<RefundRequest> findForOrders(@Param("orderIds") Collection<Long> orderIds,
                                      @Param("status") RefundRequestStatus status, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RefundRequest r where r.id = :id")
    Optional<RefundRequest> findByIdForUpdate(@Param("id") Long id);
}
