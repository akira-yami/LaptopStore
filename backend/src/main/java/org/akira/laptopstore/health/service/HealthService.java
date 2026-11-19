package org.akira.laptopstore.health.service;

import org.akira.laptopstore.health.dto.HealthResponse;
import org.akira.laptopstore.health.dto.PingResponse;

public interface HealthService {

    PingResponse ping();

    HealthResponse checkHealth();
}
