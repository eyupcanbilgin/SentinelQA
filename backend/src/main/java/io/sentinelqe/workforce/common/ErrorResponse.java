package io.sentinelqe.workforce.common;

public record ErrorResponse(String code, String message, String correlationId) { }
