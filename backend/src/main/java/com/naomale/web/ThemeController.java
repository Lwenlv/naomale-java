package com.naomale.web;

import com.naomale.auth.AuthContext;
import com.naomale.auth.AuthSupport;
import com.naomale.common.AppException;
import com.naomale.common.Jsons;
import com.naomale.service.BootstrapService;
import com.naomale.service.FamilyService;
import com.naomale.service.ThemeService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/theme")
public class ThemeController {
    private final ThemeService themeService;
    private final FamilyService familyService;
    private final BootstrapService bootstrapService;

    public ThemeController(ThemeService themeService, FamilyService familyService,
                           BootstrapService bootstrapService) {
        this.themeService = themeService;
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
        return ApiResponses.ok(themeService.get(context.user().getId()));
    }

    @PutMapping
    public Map<String, Object> save(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        AuthContext context = context(request);
        Map<String, Object> config = themeService.save(
                context.user().getId(),
                context.session().getActiveFamilyId(),
                body
        );
        return ApiResponses.state(config, bootstrapService.build(context));
    }

    @PutMapping("/active")
    public Map<String, Object> active(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        AuthContext context = context(request);
        themeService.setActive(context.user().getId(), Jsons.str(body.get("theme"), "spice"));
        return ApiResponses.state(themeService.activeTheme(context.user().getId()),
                bootstrapService.build(context));
    }

    @DeleteMapping
    public Map<String, Object> clear(HttpServletRequest request) {
        AuthContext context = context(request);
        themeService.clear(context.user().getId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("cleared", true);
        return ApiResponses.state(data, bootstrapService.build(context));
    }

    @PostMapping("/analyze")
    public Map<String, Object> analyze(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        AuthContext context = context(request);
        List<String> urls = new ArrayList<>();
        for (Object item : Jsons.list(body.get("imageUrls"))) {
            String url = Jsons.str(item, "");
            if (!url.isBlank()) urls.add(url);
        }
        if (urls.isEmpty()) throw AppException.badRequest("请先上传主题图片");
        return ApiResponses.ok(themeService.analyze(context.session().getActiveFamilyId(), urls));
    }
}
