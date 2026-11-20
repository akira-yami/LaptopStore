// Truy vấn và quản lý các bằng chứng liên quan đến yêu cầu hoàn tiền (RefundRequestEvidence) trong cơ sở dữ liệu.
package org.akira.laptopstore.payment.repository;

import org.akira.laptopstore.payment.entity.RefundRequestEvidence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
// Truy vấn và quản lý các bằng chứng liên quan đến yêu cầu hoàn tiền (RefundRequestEvidence) trong cơ sở dữ liệu.
public interface RefundRequestEvidenceRepository extends JpaRepository<RefundRequestEvidence, Long> {
    interface EvidenceId {
        Long getId();
        Long getRefundRequestId();
    }

    @Query("""
            select e.id as id, e.refundRequestId as refundRequestId
            from RefundRequestEvidence e where e.refundRequestId in :requestIds order by e.id
            """)
    List<EvidenceId> findEvidenceIds(@Param("requestIds") Collection<Long> requestIds);

    Optional<RefundRequestEvidence> findByIdAndRefundRequestId(Long id, Long refundRequestId);
}
