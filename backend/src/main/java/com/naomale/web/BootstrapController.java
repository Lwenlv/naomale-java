package com.naomale.web;

import com.naomale.auth.AuthContext;
import com.naomale.auth.AuthSupport;
import com.naomale.service.BootstrapService;
import com.naomale.service.FamilyService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class BootstrapController {
    private final BootstrapService bootstrapService;
    private final FamilyService familyService;

    public BootstrapController(BootstrapService bootstrapService, FamilyService familyService) {
        this.bootstrapService = bootstrapService;
        this.familyService = familyService;
    }

    @GetMapping("/ping")
    public Map<String, Object> ping() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("app", "naomale-dian-dan");
        return ApiResponses.ok(data);
    }

    @GetMapping("/bootstrap")
    public Map<String, Object> bootstrap(HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        familyService.requireMembership(context.user().getId(), context.session().getActiveFamilyId());
        return ApiResponses.ok(bootstrapService.build(context));
    }

    @GetMapping("/health")
    public Map<String, Object> health(HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        familyService.requireMembership(context.user().getId(), context.session().getActiveFamilyId());
        Map<String, Object> state = bootstrapService.build(context);
        return ApiResponses.ok(state.get("meta"));
    }
}
