package com.naomale.web;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseCookie;

import java.time.Duration;

public final class Cookies {
    public static final String SESSION = "naomale_session";

    private Cookies() {
    }

    public static String read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (SESSION.equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }

    public static boolean isSecure(HttpServletRequest request) {
        if (request.isSecure()) return true;
        String forwarded = request.getHeader("X-Forwarded-Proto");
        return forwarded != null && forwarded.toLowerCase().contains("https");
    }

    public static ResponseCookie sessionCookie(String token, boolean secure) {
        return ResponseCookie.from(SESSION, token)
                .httpOnly(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofDays(30))
                .secure(secure)
                .build();
    }

    public static ResponseCookie clearCookie() {
        return ResponseCookie.from(SESSION, "")
                .httpOnly(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
    }
}
