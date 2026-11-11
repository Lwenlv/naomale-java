package com.naomale.web;

import com.naomale.auth.AuthContext;
import com.naomale.auth.AuthSupport;
import com.naomale.common.Jsons;
import com.naomale.service.AiService;
import com.naomale.service.FamilyService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {
    private final AiService aiService;
    private final FamilyService familyService;

    public AiController(AiService aiService, FamilyService familyService) {
        this.aiService = aiService;
        this.familyService = familyService;
    }

    private AuthContext context(HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        familyService.requireMembership(context.user().getId(), context.session().getActiveFamilyId());
        return context;
    }

    @PostMapping("/test")
    public Map<String, Object> test(HttpServletRequest request) {
        AuthContext context = context(request);
        return ApiResponses.ok(aiService.test(context.session().getActiveFamilyId()));
    }

    @PostMapping("/parse-recipe")
    public Map<String, Object> parse(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        AuthContext context = context(request);
        return ApiResponses.ok(aiService.parseRecipe(context.session().getActiveFamilyId(),
                Jsons.str(body.get("text"), ""),
                Jsons.str(body.get("imageDataUrl"), "")));
    }

    @PostMapping("/nutrition")
    public Map<String, Object> nutrition(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        AuthContext context = context(request);
        Map<String, Object> data = new java.util.LinkedHashMap<>();
        data.put("nutrition", aiService.nutrition(
                context.session().getActiveFamilyId(),
                Jsons.str(body.get("name"), ""),
                Jsons.list(body.get("ingredients")),
                Jsons.integer(body.get("servings"), 2)
        ));
        return ApiResponses.ok(data);
    }

    @PostMapping("/nutrition-advice")
    public Map<String, Object> advice(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        AuthContext context = context(request);
        List<String> dishNames = new ArrayList<>();
        for (Object item : Jsons.list(body.get("dishNames"))) {
            String name = Jsons.str(item, "");
            if (!name.isBlank()) dishNames.add(name);
        }
        Map<String, Object> totals = Jsons.map(body.get("totals"));
        Map<String, Object> data = new java.util.LinkedHashMap<>();
        data.put("advice", aiService.advice(
                context.session().getActiveFamilyId(),
                dishNames,
                Jsons.integer(body.get("dinerCount"), 1),
                totals
        ));
        return ApiResponses.ok(data);
    }
}
