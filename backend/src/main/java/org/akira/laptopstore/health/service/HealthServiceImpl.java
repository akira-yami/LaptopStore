package org.akira.laptopstore.health.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.akira.laptopstore.health.dto.HealthResponse;
import org.akira.laptopstore.health.dto.PingResponse;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.sql.Connection;
import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class HealthServiceImpl implements HealthService {

    private final DataSource dataSource;

    @Override
    public PingResponse ping() {
        return PingResponse.builder()
                .status("UP")
                .message("pong")
                .timestamp(Instant.now())
                .build();
    }

    @Override
    public HealthResponse checkHealth() {
        long uptime = ManagementFactory.getRuntimeMXBean().getUptime();
        Instant now = Instant.now();

        try (Connection connection = dataSource.getConnection()) {
            boolean valid = connection.isValid(2);
            if (valid) {
                return HealthResponse.builder()
                        .status("UP")
                        .database("UP")
                        .uptimeMs(uptime)
                        .timestamp(now)
                        .build();
            } else {
                return HealthResponse.builder()
                        .status("DOWN")
                        .database("DOWN")
                        .uptimeMs(uptime)
                        .timestamp(now)
                        .error("Database connection is not valid")
                        .build();
            }
        } catch (Exception ex) {
            log.error("Database health check failed: {}", ex.getMessage());
            return HealthResponse.builder()
                    .status("DOWN")
                    .database("DOWN")
                    .uptimeMs(uptime)
                    .timestamp(now)
                    .error(ex.getMessage())
                    .build();
        }
    }
}
