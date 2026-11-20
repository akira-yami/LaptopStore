package org.akira.laptopstore.promotion.repository;

import jakarta.persistence.LockModeType;
import org.akira.laptopstore.promotion.entity.LoyaltyAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface LoyaltyAccountRepository extends JpaRepository<LoyaltyAccount, Long> {

    Optional<LoyaltyAccount> findByUserId(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select la from LoyaltyAccount la where la.userId = :userId")
    Optional<LoyaltyAccount> findByUserIdForUpdate(@Param("userId") Long userId);
}
