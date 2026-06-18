package org.vaidik.appointment.config;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationErrors(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(401)
                .body(Map.of("message", "Incorrect email or password. Please try again."));
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<Map<String, String>> handleDisabled(DisabledException ex) {
        return ResponseEntity.status(401)
                .body(Map.of("message", "Your account has been deactivated. Please contact support."));
    }

    @ExceptionHandler(LockedException.class)
    public ResponseEntity<Map<String, String>> handleLocked(LockedException ex) {
        return ResponseEntity.status(401)
                .body(Map.of("message", "Your account is temporarily locked. Please try again later."));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred.";
        // Resource not found → 404
        if (msg.toLowerCase().contains("not found")) {
            return ResponseEntity.status(404).body(Map.of("message", msg));
        }
        // Auth / permission errors → 403
        if (msg.toLowerCase().contains("not authorized") || msg.toLowerCase().contains("unauthorized")) {
            return ResponseEntity.status(403).body(Map.of("message", msg));
        }
        // Business logic errors → 400
        return ResponseEntity.badRequest().body(Map.of("message", msg));
    }
}