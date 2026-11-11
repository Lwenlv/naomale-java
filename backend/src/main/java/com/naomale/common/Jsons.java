package com.naomale.common;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** JSON 与 Map 取值工具。 */
public final class Jsons {
    public static final ObjectMapper MAPPER = new ObjectMapper();

    private Jsons() {
    }

    public static String write(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (Exception error) {
            throw new IllegalStateException("JSON 序列化失败", error);
        }
    }

    public static Object parse(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return MAPPER.readValue(json, new TypeReference<Object>() {
            });
        } catch (Exception error) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> map(Object value) {
        if (value instanceof Map<?, ?> source) {
            Map<String, Object> result = new LinkedHashMap<>();
            source.forEach((key, item) -> result.put(String.valueOf(key), item));
            return result;
        }
        if (value instanceof String text) {
            Object parsed = parse(text);
            if (parsed instanceof Map<?, ?> source) {
                Map<String, Object> result = new LinkedHashMap<>();
                source.forEach((key, item) -> result.put(String.valueOf(key), item));
                return result;
            }
        }
        return new LinkedHashMap<>();
    }

    @SuppressWarnings("unchecked")
    public static List<Object> list(Object value) {
        if (value instanceof List<?> source) return new ArrayList<>(source);
        if (value instanceof String text) {
            Object parsed = parse(text);
            if (parsed instanceof List<?> source) return new ArrayList<>(source);
        }
        return new ArrayList<>();
    }

    public static String str(Object value, String fallback) {
        if (value == null) return fallback;
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? fallback : text;
    }

    public static double dbl(Object value, double fallback) {
        if (value instanceof Number number) return number.doubleValue();
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (Exception error) {
            return fallback;
        }
    }

    public static int integer(Object value, int fallback) {
        if (value instanceof Number number) return number.intValue();
        try {
            return (int) Math.round(Double.parseDouble(String.valueOf(value)));
        } catch (Exception error) {
            return fallback;
        }
    }

    public static boolean bool(Object value, boolean fallback) {
        if (value instanceof Boolean result) return result;
        if (value == null) return fallback;
        return "true".equalsIgnoreCase(String.valueOf(value));
    }
}
