package org.akira.laptopstore.promotion.repository;

import org.akira.laptopstore.promotion.entity.LoyaltyTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransaction, Long> {

    boolean existsByOperationKey(String operationKey);

    List<LoyaltyTransaction> findByUserIdOrderByCreatedAtDescIdDesc(Long userId);
}
