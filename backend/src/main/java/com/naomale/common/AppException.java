package com.naomale.common;

public class AppException extends RuntimeException {
    private final int status;

    public AppException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }

    public static AppException badRequest(String message) {
        return new AppException(400, message);
    }

    public static AppException unauthorized(String message) {
        return new AppException(401, message);
    }

    public static AppException forbidden(String message) {
        return new AppException(403, message);
    }

    public static AppException notFound(String message) {
        return new AppException(404, message);
    }

    public static AppException conflict(String message) {
        return new AppException(409, message);
    }
}
