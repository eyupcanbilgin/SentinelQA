package io.sentinelqe.workforce.common;

import org.springframework.http.HttpStatus;

public class DomainException extends RuntimeException {
    private final String code;
    private final HttpStatus status;
    public DomainException(String code, String message, HttpStatus status) { super(message); this.code = code; this.status = status; }
    public String code() { return code; }
    public HttpStatus status() { return status; }
    public static DomainException conflict(String code, String message) { return new DomainException(code, message, HttpStatus.CONFLICT); }
    public static DomainException forbidden() { return new DomainException("FORBIDDEN", "This operation is not permitted", HttpStatus.FORBIDDEN); }
    public static DomainException notFound() { return new DomainException("NOT_FOUND", "Resource not found", HttpStatus.NOT_FOUND); }
}
