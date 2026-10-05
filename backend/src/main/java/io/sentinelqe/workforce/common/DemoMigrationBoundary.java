package io.sentinelqe.workforce.common;

import java.util.Arrays;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class DemoMigrationBoundary {
    @Bean
    FlywayMigrationStrategy profileBoundMigrations(Environment environment) {
        return flyway -> {
            boolean demo = Arrays.asList(environment.getActiveProfiles()).contains("demo");
            // An older demo DB may have V2 recorded as a future/missing migration.
            // Never start it in normal mode merely because Flyway ignores future versions.
            if (!demo && Arrays.stream(flyway.info().all())
                    .anyMatch(migration -> "V2__demo_seed.sql".equals(migration.getScript()))) {
                throw new IllegalStateException("Demo-provisioned database requires the explicit demo profile; use a separate fresh database for normal startup");
            }
            flyway.migrate();
        };
    }
}
