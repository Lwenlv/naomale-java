package com.naomale.web;

import com.naomale.auth.AuthContext;
import com.naomale.auth.AuthSupport;
import com.naomale.common.Jsons;
import com.naomale.service.BootstrapService;
import com.naomale.service.FamilyService;
import com.naomale.service.OrderService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class OrderController {
    private final OrderService orderService;
    private final FamilyService familyService;
    private final BootstrapService bootstrapService;

    public OrderController(OrderService orderService, FamilyService familyService,
                           BootstrapService bootstrapService) {
        this.orderService = orderService;
        this.familyService = familyService;
        this.bootstrapService = bootstrapService;
    }

    private AuthContext context(HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        familyService.requireMembership(context.user().getId(), context.session().getActiveFamilyId());
        return context;
    }

    @GetMapping("/current-order")
    public Map<String, Object> current(HttpServletRequest request) {
        AuthContext context = context(request);
        return ApiResponses.ok(orderService.currentView(context.session().getActiveFamilyId()));
    }

    @PutMapping("/current-order")
    public Map<String, Object> save(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return saveInternal(body, request);
    }

    @PostMapping("/current-order")
    public Map<String, Object> saveByPost(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return saveInternal(body, request);
    }

    private Map<String, Object> saveInternal(Map<String, Object> body, HttpServletRequest request) {
        AuthContext context = context(request);
        Map<String, Object> order = body.get("order") instanceof Map ? Jsons.map(body.get("order")) : body;
        Map<String, Object> saved = orderService.updateCurrent(context.session().getActiveFamilyId(), order);
        return ApiResponses.state(saved, bootstrapService.build(context));
    }

    @DeleteMapping("/current-order")
    public Map<String, Object> clear(HttpServletRequest request) {
        AuthContext context = context(request);
        Map<String, Object> saved = orderService.clearCurrent(context.session().getActiveFamilyId());
        return ApiResponses.state(saved, bootstrapService.build(context));
    }

    @PostMapping("/current-order/archive")
    public Map<String, Object> archive(@RequestBody(required = false) Map<String, Object> body,
                                       HttpServletRequest request) {
        AuthContext context = context(request);
        Double cost = null;
        if (body != null && body.get("actualCost") instanceof Number number) {
            cost = number.doubleValue();
        }
        Map<String, Object> result = orderService.archive(context.session().getActiveFamilyId(), cost);
        return ApiResponses.state(result, bootstrapService.build(context));
    }

    @GetMapping("/orders")
    public Map<String, Object> history(HttpServletRequest request) {
        AuthContext context = context(request);
        return ApiResponses.ok(orderService.historyViews(context.session().getActiveFamilyId()));
    }

    @DeleteMapping("/orders/{id}")
    public Map<String, Object> delete(@PathVariable String id, HttpServletRequest request) {
        AuthContext context = context(request);
        orderService.deleteHistory(context.session().getActiveFamilyId(), id);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", id);
        return ApiResponses.state(data, bootstrapService.build(context));
    }

    @PostMapping("/orders/{id}/reorder")
    public Map<String, Object> reorder(@PathVariable String id, HttpServletRequest request) {
        AuthContext context = context(request);
        Map<String, Object> order = orderService.reorder(context.session().getActiveFamilyId(), id);
        return ApiResponses.state(order, bootstrapService.build(context));
    }
}
