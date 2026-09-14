package io.sentinelqe.workforce.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private ErrorResponse error(String code, String message, HttpServletRequest request) { return new ErrorResponse(code, message, (String) request.getAttribute("correlationId")); }
    @ExceptionHandler(DomainException.class)
    ResponseEntity<ErrorResponse> domain(DomainException ex, HttpServletRequest req) { return ResponseEntity.status(ex.status()).body(error(ex.code(), ex.getMessage(), req)); }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class, ConstraintViolationException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorResponse> validation(Exception ex, HttpServletRequest req) { return ResponseEntity.badRequest().body(error("VALIDATION_ERROR", "Request fields are invalid", req)); }
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ErrorResponse> forbidden(AccessDeniedException ex, HttpServletRequest req) { return ResponseEntity.status(403).body(error("FORBIDDEN", "This operation is not permitted", req)); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorResponse> conflict(DataIntegrityViolationException ex, HttpServletRequest req) { return ResponseEntity.status(409).body(error("DATA_CONFLICT", "The operation conflicts with existing data", req)); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> unexpected(Exception ex, HttpServletRequest req) { LOG.error("Unhandled request error route={}", req.getRequestURI(), ex); return ResponseEntity.internalServerError().body(error("INTERNAL_ERROR", "An unexpected error occurred", req)); }
}
