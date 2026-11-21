package org.akira.laptopstore.catalog.repository;

import org.akira.laptopstore.catalog.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByName(String name);

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);

    @Query(value = "SELECT * FROM categories ORDER BY id ASC", nativeQuery = true)
    List<Category> findAllIncludeInactive();

    @Query(value = "SELECT * FROM categories WHERE id = :id", nativeQuery = true)
    Optional<Category> findByIdNative(@Param("id") Long id);

    @Query(value = "SELECT COUNT(*) > 0 FROM categories WHERE LOWER(name) = LOWER(:name)", nativeQuery = true)
    boolean existsByNameNative(@Param("name") String name);

    @Query(value = "SELECT COUNT(*) > 0 FROM categories WHERE LOWER(name) = LOWER(:name) AND id != :id", nativeQuery = true)
    boolean existsByNameAndIdNotNative(@Param("name") String name, @Param("id") Long id);

    @Modifying
    @Query(value = "UPDATE categories SET active = :active WHERE id = :id", nativeQuery = true)
    int updateActiveStatus(@Param("id") Long id, @Param("active") boolean active);
}
