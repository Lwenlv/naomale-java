package com.naomale.web;

import com.naomale.Entities;
import com.naomale.auth.AuthContext;
import com.naomale.auth.AuthSupport;
import com.naomale.common.Jsons;
import com.naomale.service.BootstrapService;
import com.naomale.service.FamilyService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/families")
public class FamilyController {
    private final FamilyService familyService;
    private final BootstrapService bootstrapService;

    public FamilyController(FamilyService familyService, BootstrapService bootstrapService) {
        this.familyService = familyService;
        this.bootstrapService = bootstrapService;
    }

    @GetMapping
    public Map<String, Object> list(HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        return ApiResponses.ok(familyService.summaries(context.user().getId()));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body,
                                                      HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        Entities.Family family = familyService.create(context.user(), Jsons.str(body.get("name"), "新家庭"));
        familyService.switchFamily(context.session(), family.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponses.ok(bootstrapService.build(context.user(), context.session())));
    }

    @PostMapping("/join")
    public Map<String, Object> join(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        Entities.Family family = familyService.join(context.user(), Jsons.str(body.get("inviteCode"), ""));
        familyService.switchFamily(context.session(), family.getId());
        return ApiResponses.ok(bootstrapService.build(context.user(), context.session()));
    }

    @PostMapping("/{id}/switch")
    public Map<String, Object> switchFamily(@PathVariable String id, HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        familyService.switchFamily(context.session(), id);
        return ApiResponses.ok(bootstrapService.build(context.user(), context.session()));
    }

    @GetMapping("/{id}/invite")
    public Map<String, Object> invite(@PathVariable String id, HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("inviteCode", familyService.invite(context.user().getId(), id));
        return ApiResponses.ok(data);
    }

    @GetMapping("/{id}/members")
    public Map<String, Object> members(@PathVariable String id, HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        List<Map<String, Object>> members = new ArrayList<>();
        for (Entities.FamilyMemberRow row : familyService.members(context.user().getId(), id)) {
            Map<String, Object> member = new LinkedHashMap<>();
            member.put("userId", row.getUserId());
            member.put("username", row.getUsername());
            member.put("displayName", row.getDisplayName());
            member.put("role", row.getRole());
            member.put("joinedAt", row.getJoinedAt());
            members.add(member);
        }
        return ApiResponses.ok(members);
    }
}
