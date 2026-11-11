package com.naomale.web;

import com.naomale.auth.AuthContext;
import com.naomale.auth.AuthSupport;
import com.naomale.common.Jsons;
import com.naomale.service.BootstrapService;
import com.naomale.service.DishService;
import com.naomale.service.FamilyService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dishes")
public class DishController {
    private final DishService dishService;
    private final FamilyService familyService;
    private final BootstrapService bootstrapService;

    public DishController(DishService dishService, FamilyService familyService, BootstrapService bootstrapService) {
        this.dishService = dishService;
        this.familyService = familyService;
        this.bootstrapService = bootstrapService;
    }

    private AuthContext context(HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        familyService.requireMembership(context.user().getId(), context.session().getActiveFamilyId());
        return context;
    }

    @GetMapping
    public Map<String, Object> list(HttpServletRequest request) {
        AuthContext context = context(request);
        return ApiResponses.ok(dishService.listView(context.session().getActiveFamilyId()).get("dishes"));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Object body, HttpServletRequest request) {
        AuthContext context = context(request);
        String familyId = context.session().getActiveFamilyId();
        Map<String, Object> payload = body instanceof Map ? Jsons.map(body) : new LinkedHashMap<>();
        Map<String, Object> dish = dishService.save(familyId, payload);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponses.state(dish, bootstrapService.build(context)));
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Map<String, Object> body,
                                      HttpServletRequest request) {
        AuthContext context = context(request);
        body.put("id", id);
        Map<String, Object> dish = dishService.save(context.session().getActiveFamilyId(), body);
        return ApiResponses.state(dish, bootstrapService.build(context));
    }

    @PatchMapping("/{id}/favorite")
    public Map<String, Object> favorite(@PathVariable String id, @RequestBody Map<String, Object> body,
                                        HttpServletRequest request) {
        AuthContext context = context(request);
        Map<String, Object> dish = dishService.favorite(context.session().getActiveFamilyId(), id,
                Jsons.bool(body.get("favorite"), false));
        return ApiResponses.state(dish, bootstrapService.build(context));
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable String id, HttpServletRequest request) {
        AuthContext context = context(request);
        dishService.delete(context.session().getActiveFamilyId(), id);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", id);
        return ApiResponses.state(data, bootstrapService.build(context));
    }
}
