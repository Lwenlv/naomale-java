package com.naomale.web;

import java.util.LinkedHashMap;
import java.util.Map;

public final class ApiResponses {
    private ApiResponses() {
    }

    public static Map<String, Object> ok(Object data) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("ok", true);
        map.put("data", data);
        return map;
    }

    public static Map<String, Object> state(Object data, Object state) {
        Map<String, Object> map = ok(data);
        map.put("state", state);
        return map;
    }
}
