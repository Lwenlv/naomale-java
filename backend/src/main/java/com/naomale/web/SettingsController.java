package com.naomale.web;

import com.naomale.auth.AuthContext;
import com.naomale.auth.AuthSupport;
import com.naomale.service.BootstrapService;
import com.naomale.service.FamilyService;
import com.naomale.service.SettingsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {
    private final SettingsService settingsService;
    private final FamilyService familyService;
    private final BootstrapService bootstrapService;

    public SettingsController(SettingsService settingsService, FamilyService familyService,
                              BootstrapService bootstrapService) {
        this.settingsService = settingsService;
        this.familyService = familyService;
        this.bootstrapService = bootstrapService;
    }

    private AuthContext context(HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        familyService.requireMembership(context.user().getId(), context.session().getActiveFamilyId());
        return context;
    }

    @GetMapping
    public Map<String, Object> get(HttpServletRequest request) {
        AuthContext context = context(request);
        return ApiResponses.ok(settingsService.publicSettings(context.session().getActiveFamilyId()));
    }

    @PutMapping
    public Map<String, Object> update(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        AuthContext context = context(request);
        Map<String, Object> settings = settingsService.update(context.session().getActiveFamilyId(), body);
        return ApiResponses.state(settings, bootstrapService.build(context));
    }
}
