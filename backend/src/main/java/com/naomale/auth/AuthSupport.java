package com.naomale.auth;

import com.naomale.common.AppException;
import jakarta.servlet.http.HttpServletRequest;

public final class AuthSupport {
    public static final String ATTRIBUTE = "naomale.auth";

    private AuthSupport() {
    }

    public static AuthContext optional(HttpServletRequest request) {
        Object value = request.getAttribute(ATTRIBUTE);
        return value instanceof AuthContext context ? context : null;
    }

    public static AuthContext require(HttpServletRequest request) {
        AuthContext context = optional(request);
        if (context == null) throw AppException.unauthorized("请先登录");
        return context;
    }

    public static String familyId(HttpServletRequest request) {
        AuthContext context = require(request);
        String familyId = context.session().getActiveFamilyId();
        if (familyId == null || familyId.isBlank()) throw new AppException(409, "请先创建或加入一个家庭");
        return familyId;
    }
}
