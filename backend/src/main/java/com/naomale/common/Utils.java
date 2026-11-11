package com.naomale.common;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HexFormat;
import java.util.UUID;

public final class Utils {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final ZoneId ZONE = ZoneId.of("Asia/Shanghai");

    private Utils() {
    }

    public static String uuid() {
        return UUID.randomUUID().toString();
    }

    public static String now() {
        return Instant.now().toString();
    }

    public static String expiresInDays(int days) {
        return Instant.now().plusSeconds(days * 86400L).toString();
    }

    public static String today() {
        return LocalDate.now(ZONE).toString();
    }

    public static String newSessionToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    public static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception error) {
            throw new IllegalStateException("SHA-256 不可用", error);
        }
    }

    public static String inviteCode() {
        byte[] bytes = new byte[4];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes).toUpperCase();
    }

    public static BigDecimal money(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }

    public static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    public static String maskKey(String key) {
        if (key == null || key.isBlank()) return "";
        String trimmed = key.trim();
        if (trimmed.length() <= 8) return "****";
        return trimmed.substring(0, 3) + "****" + trimmed.substring(trimmed.length() - 4);
    }
}
