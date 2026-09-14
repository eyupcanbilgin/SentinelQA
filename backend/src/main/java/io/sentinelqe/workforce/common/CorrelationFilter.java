package io.sentinelqe.workforce.common;

import io.micrometer.tracing.Tracer;
import io.opentelemetry.api.trace.Span;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class CorrelationFilter extends OncePerRequestFilter {
    private static final Logger LOG = LoggerFactory.getLogger(CorrelationFilter.class);

    private final Tracer tracer;

    @Autowired
    public CorrelationFilter(@Autowired(required = false) Tracer tracer) {
        this.tracer = tracer;
    }

    @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        String candidate = req.getHeader("X-Correlation-ID");
        String id = candidate != null && candidate.matches("[A-Za-z0-9._-]{1,64}") ? candidate : UUID.randomUUID().toString();
        req.setAttribute("correlationId", id);
        res.setHeader("X-Correlation-ID", id);
        MDC.put("correlationId", id);

        // Bind canonical correlation.id attribute to active OpenTelemetry span
        Span currentOtelSpan = Span.current();
        if (currentOtelSpan != null && currentOtelSpan.getSpanContext().isValid()) {
            currentOtelSpan.setAttribute("correlation.id", id);
        }
        if (tracer != null && tracer.currentSpan() != null) {
            tracer.currentSpan().tag("correlation.id", id);
        }

        try {
            chain.doFilter(req, res);
        } finally {
            // Re-apply in finally in case the server span was initialized or wrapped during filter chain execution
            Span finalOtelSpan = Span.current();
            if (finalOtelSpan != null && finalOtelSpan.getSpanContext().isValid()) {
                finalOtelSpan.setAttribute("correlation.id", id);
            }
            if (tracer != null && tracer.currentSpan() != null) {
                tracer.currentSpan().tag("correlation.id", id);
            }
            LOG.info("http method={} route={} status={}", req.getMethod(), req.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE), res.getStatus());
            MDC.remove("correlationId");
        }
    }
}
