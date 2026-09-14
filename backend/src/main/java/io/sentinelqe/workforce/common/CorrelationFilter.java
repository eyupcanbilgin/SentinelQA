package io.sentinelqe.workforce.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class CorrelationFilter extends OncePerRequestFilter {
    private static final Logger LOG = LoggerFactory.getLogger(CorrelationFilter.class);
    @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        String candidate = req.getHeader("X-Correlation-ID");
        String id = candidate != null && candidate.matches("[A-Za-z0-9._-]{1,64}") ? candidate : UUID.randomUUID().toString();
        req.setAttribute("correlationId", id); res.setHeader("X-Correlation-ID", id); MDC.put("correlationId", id);
        try { chain.doFilter(req, res); }
        finally { LOG.info("http method={} route={} status={}", req.getMethod(), req.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE), res.getStatus()); MDC.remove("correlationId"); }
    }
}
