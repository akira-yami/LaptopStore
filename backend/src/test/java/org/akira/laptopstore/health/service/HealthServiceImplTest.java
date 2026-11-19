package org.akira.laptopstore.health.service;

import org.akira.laptopstore.health.dto.HealthResponse;
import org.akira.laptopstore.health.dto.PingResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HealthServiceImplTest {

    @Mock
    private DataSource dataSource;

    @Mock
    private Connection connection;

    private HealthService healthService;

    @BeforeEach
    void setUp() {
        healthService = new HealthServiceImpl(dataSource);
    }

    @Test
    @DisplayName("ping() should return UP status and pong message")
    void ping_shouldReturnUpAndPong() {
        PingResponse response = healthService.ping();

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("UP");
        assertThat(response.getMessage()).isEqualTo("pong");
        assertThat(response.getTimestamp()).isNotNull();
    }

    @Test
    @DisplayName("checkHealth() should return UP when database connection is valid")
    void checkHealth_whenConnectionValid_shouldReturnUp() throws Exception {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(true);

        HealthResponse response = healthService.checkHealth();

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("UP");
        assertThat(response.getDatabase()).isEqualTo("UP");
        assertThat(response.getError()).isNull();
        assertThat(response.getUptimeMs()).isGreaterThan(0L);
        assertThat(response.getTimestamp()).isNotNull();
    }

    @Test
    @DisplayName("checkHealth() should return DOWN when database throws SQLException")
    void checkHealth_whenSQLException_shouldReturnDown() throws Exception {
        when(dataSource.getConnection()).thenThrow(new SQLException("Database offline"));

        HealthResponse response = healthService.checkHealth();

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("DOWN");
        assertThat(response.getDatabase()).isEqualTo("DOWN");
        assertThat(response.getError()).contains("Database offline");
    }

    @Test
    @DisplayName("checkHealth() should return DOWN when connection is invalid")
    void checkHealth_whenConnectionInvalid_shouldReturnDown() throws Exception {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(false);

        HealthResponse response = healthService.checkHealth();

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("DOWN");
        assertThat(response.getDatabase()).isEqualTo("DOWN");
        assertThat(response.getError()).isEqualTo("Database connection is not valid");
    }
}
