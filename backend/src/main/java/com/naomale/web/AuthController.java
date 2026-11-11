package com.naomale.web;

import com.naomale.Entities;
import com.naomale.auth.AuthContext;
import com.naomale.auth.AuthSupport;
import com.naomale.common.Jsons;
import com.naomale.service.AuthService;
import com.naomale.service.BootstrapService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final BootstrapService bootstrapService;

    public AuthController(AuthService authService, BootstrapService bootstrapService) {
        this.authService = authService;
        this.bootstrapService = bootstrapService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, Object> body,
                                                        HttpServletRequest request, HttpServletResponse response) {
        AuthService.Result result = authService.register(
                Jsons.str(body.get("username"), ""),
                Jsons.str(body.get("password"), ""),
                Jsons.str(body.get("displayName"), "")
        );
        response.addHeader(HttpHeaders.SET_COOKIE,
                Cookies.sessionCookie(result.token(), Cookies.isSecure(request)).toString());
        Entities.Session session = new Entities.Session();
        session.setTokenHash("temp");
        session.setUserId(result.user().getId());
        session.setActiveFamilyId(result.familyId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponses.ok(bootstrapService.build(result.user(), session)));
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, Object> body,
                                     HttpServletRequest request, HttpServletResponse response) {
        AuthService.Result result = authService.login(
                Jsons.str(body.get("username"), ""),
                Jsons.str(body.get("password"), "")
        );
        response.addHeader(HttpHeaders.SET_COOKIE,
                Cookies.sessionCookie(result.token(), Cookies.isSecure(request)).toString());
        Entities.Session session = new Entities.Session();
        session.setUserId(result.user().getId());
        session.setActiveFamilyId(result.familyId());
        return ApiResponses.ok(bootstrapService.build(result.user(), session));
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("hasAccounts", authService.userCount() > 0);
        return ApiResponses.ok(data);
    }

    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        return ApiResponses.ok(bootstrapService.authState(context.user(), context.session()));
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(Cookies.read(request));
        response.addHeader(HttpHeaders.SET_COOKIE, Cookies.clearCookie().toString());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("loggedOut", true);
        return ApiResponses.ok(data);
    }
}
