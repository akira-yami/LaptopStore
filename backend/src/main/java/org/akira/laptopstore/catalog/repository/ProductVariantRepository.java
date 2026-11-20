package org.akira.laptopstore.catalog.repository;

import org.akira.laptopstore.catalog.entity.ProductVariant;

import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;

import org.springframework.data.repository.query.Param;


import jakarta.persistence.LockModeType;

import java.util.Collection;
import java.util.Optional;
import java.util.List;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {
    Optional<ProductVariant> findBySku(String sku);

    // Nhờ có @SQLRestriction("active = true") ở Entity, hàm này sẽ tự động KHÔNG lấy các Variant đã bị Deactivate!
    List<ProductVariant> findByProductId(Long productId);

    /*
     * =========================================================================
     * [TẠI SAO THAY ĐỔI & BẢN CHẤT NGHIỆP VỤ - findAllByProductIdNative]:
     * - Tại sao thay đổi: Dùng Native SQL để lấy TOÀN BỘ biến thể của sản phẩm (bao gồm cả active = false).
     * - Giữ theo cách cũ (findByProductId): Do entity ProductVariant có gắn `@SQLRestriction("active = true")`,
     *   mọi câu lệnh Spring Data JPA thông thường đều tự động chèn mệnh đề `WHERE active = true`. Khi đó,
     *   nhân viên hoặc admin sẽ KHÔNG THỂ NHÌN THẤY các biến thể đã bị tạm tắt bán, dẫn đến không thể kích hoạt lại.
     * - Xử lý theo cách mới được lợi gì:
     *   Bỏ qua restriction Hibernate, cho phép quản trị viên xem danh sách đầy đủ để quản lý và bật bán lại khi có hàng.
     * =========================================================================
     */
    @Query(value = "SELECT * FROM product_variants WHERE product_id = :productId ORDER BY id ASC", nativeQuery = true)
    List<ProductVariant> findAllByProductIdNative(@Param("productId") Long productId);



    boolean existsBySku(String sku);

    //Kiểm tra SKU trùng, nhưng bỏ qua Variant đang được cập nhật
    //Kiểm tra SKU đã tồn tại ở bản ghi khác (khác id hiện tại)
    boolean existsBySkuAndIdNot(String sku, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select variant from ProductVariant variant join fetch variant.product where variant.id in :variantIds order by variant.id")
    List<ProductVariant> findAllByIdInForUpdate(@Param("variantIds") List<Long> variantIds);

    //Dùng Native Query để chọc thẳng xuống DB, bỏ qua @SQLRestriction
    @Modifying
    @Query(value = "UPDATE product_variants SET active = :isActive WHERE id = :variantId AND product_id = :productId", nativeQuery = true)
    int updateActiveStatus(@Param("productId") Long productId, @Param("variantId") Long variantId, @Param("isActive") boolean isActive);

    // --- BỔ SUNG CHO INVENTORY QUERY CONTRACT ---

    @Query("SELECT v FROM ProductVariant v JOIN FETCH v.product WHERE v.id = :variantId")
    Optional<ProductVariant> findByIdWithProduct(@Param("variantId") Long variantId);

    @Query("SELECT v FROM ProductVariant v JOIN FETCH v.product WHERE v.id IN :variantIds ORDER BY v.id ASC")
    List<ProductVariant> findAllByIdInWithProduct(@Param("variantIds") Collection<Long> variantIds);

    @Query("SELECT v FROM ProductVariant v JOIN FETCH v.product ORDER BY v.quantity ASC, v.id ASC")
    List<ProductVariant> findAllWithProductOrderByQuantityAsc();

    @Query("SELECT v FROM ProductVariant v JOIN FETCH v.product WHERE v.quantity <= :threshold ORDER BY v.quantity ASC, v.id ASC")
    List<ProductVariant> findLowStockVariants(@Param("threshold") int threshold);

    // BỔ SUNG HÀM NÀY ĐỂ CHỐNG GHI ĐÈ TỒN KHO
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProductVariant p WHERE p.id = :id")
    Optional<ProductVariant> findByIdForUpdate(@Param("id") Long id);
}
