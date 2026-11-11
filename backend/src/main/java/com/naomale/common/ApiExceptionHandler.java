package com.naomale.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<Map<String, Object>> handleApp(AppException error) {
        return ResponseEntity.status(error.getStatus()).body(body(error.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleOther(Exception error) {
        error.printStackTrace();
        return ResponseEntity.status(500).body(body("服务器内部错误：" + safeMessage(error)));
    }

    private String safeMessage(Exception error) {
        String message = error.getMessage();
        return message == null ? error.getClass().getSimpleName() : message;
    }

    private Map<String, Object> body(String message) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("ok", false);
        map.put("error", message);
        return map;
    }
}
