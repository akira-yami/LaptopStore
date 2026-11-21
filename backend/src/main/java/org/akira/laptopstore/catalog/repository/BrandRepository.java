package org.akira.laptopstore.catalog.repository;

import org.akira.laptopstore.catalog.entity.Brand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BrandRepository extends JpaRepository<Brand, Long> {
    Optional<Brand> findByName(String name);

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);

    @Query(value = "SELECT * FROM brands ORDER BY id ASC", nativeQuery = true)
    List<Brand> findAllIncludeInactive();

    @Query(value = "SELECT * FROM brands WHERE id = :id", nativeQuery = true)
    Optional<Brand> findByIdNative(@Param("id") Long id);

    @Query(value = "SELECT COUNT(*) > 0 FROM brands WHERE LOWER(name) = LOWER(:name)", nativeQuery = true)
    boolean existsByNameNative(@Param("name") String name);

    @Query(value = "SELECT COUNT(*) > 0 FROM brands WHERE LOWER(name) = LOWER(:name) AND id != :id", nativeQuery = true)
    boolean existsByNameAndIdNotNative(@Param("name") String name, @Param("id") Long id);

    @Modifying
    @Query(value = "UPDATE brands SET active = :active WHERE id = :id", nativeQuery = true)
    int updateActiveStatus(@Param("id") Long id, @Param("active") boolean active);
}
