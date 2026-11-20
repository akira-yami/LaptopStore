package org.akira.laptopstore.order.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Đảm bảo cấu hình JPA trên {@link Order} và migration Flyway thống nhất phạm vi
 * duy nhất của idempotency_key theo từng cặp (user_id, idempotency_key),
 * đồng bộ với truy vấn findByIdempotencyKeyAndUserId trong OrderRepository.
 */
class OrderEntityConstraintTest {

    @Test
    void orderEntityScopesIdempotencyKeyUniquenessToUserPair() throws NoSuchFieldException {
        Field idempotencyKeyField = Order.class.getDeclaredField("idempotencyKey");
        Column column = idempotencyKeyField.getAnnotation(Column.class);
        assertNotNull(column, "Field idempotencyKey phải có @Column");
        assertEquals("idempotency_key", column.name());
        assertFalse(column.unique(),
                "Cột idempotency_key không được đặt unique = true toàn cục; phải đặt unique ghép (user_id, idempotency_key)");

        Table table = Order.class.getAnnotation(Table.class);
        assertNotNull(table, "Entity Order phải có @Table");
        List<UniqueConstraint> matchingConstraints = Arrays.stream(table.uniqueConstraints())
                .filter(uc -> Arrays.asList(uc.columnNames()).equals(List.of("user_id", "idempotency_key")))
                .toList();
        assertEquals(1, matchingConstraints.size(),
                "@Table của Order phải khai báo UniqueConstraint cho cặp (user_id, idempotency_key)");
        assertEquals("uq_orders_user_idempotency_key", matchingConstraints.getFirst().name());
    }

    @Test
    void flywayV8MigrationReplacesGlobalIdempotencyConstraintWithCompositeUserConstraint() throws Exception {
        Path migrationPath = Path.of("src/main/resources/db/migration/V8__scope_order_idempotency_key_to_user.sql");
        assertTrue(Files.exists(migrationPath),
                "Phải có Flyway migration V8__scope_order_idempotency_key_to_user.sql");

        String sql = Files.readString(migrationPath, StandardCharsets.UTF_8);
        assertTrue(sql.contains("DROP CONSTRAINT IF EXISTS uq_orders_idempotency_key"),
                "Migration V8 phải gỡ constraint toàn cục uq_orders_idempotency_key");
        assertTrue(sql.contains("DROP CONSTRAINT IF EXISTS orders_idempotency_key_key"),
                "Migration V8 phải gỡ constraint toàn cục orders_idempotency_key_key (nếu tạo từ V2)");
        assertTrue(sql.contains("ADD CONSTRAINT uq_orders_user_idempotency_key UNIQUE (user_id, idempotency_key)"),
                "Migration V8 phải thêm constraint ghép uq_orders_user_idempotency_key UNIQUE (user_id, idempotency_key)");
    }
}
