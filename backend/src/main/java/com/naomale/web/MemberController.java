package com.naomale.web;

import com.naomale.Entities;
import com.naomale.auth.AuthContext;
import com.naomale.auth.AuthSupport;
import com.naomale.common.Jsons;
import com.naomale.service.BootstrapService;
import com.naomale.service.FamilyService;
import com.naomale.service.MemberService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/members")
public class MemberController {
    private final MemberService memberService;
    private final FamilyService familyService;
    private final BootstrapService bootstrapService;

    public MemberController(MemberService memberService, FamilyService familyService,
                            BootstrapService bootstrapService) {
        this.memberService = memberService;
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
        return ApiResponses.ok(memberService.listView(context.session().getActiveFamilyId()).get("members"));
    }

    @PutMapping
    public Map<String, Object> replace(@RequestBody Object body, HttpServletRequest request) {
        AuthContext context = context(request);
        List<Object> members;
        if (body instanceof List) {
            members = Jsons.list(body);
        } else {
            members = Jsons.list(Jsons.map(body).get("members"));
        }
        List<Entities.MealMember> saved = memberService.replace(context.session().getActiveFamilyId(), members);
        return ApiResponses.state(memberService.listView(context.session().getActiveFamilyId()).get("members"),
                bootstrapService.build(context));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> add(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        AuthContext context = context(request);
        Map<String, Object> memberMap = body.get("member") instanceof Map ? Jsons.map(body.get("member")) : body;
        Entities.MealMember member = memberService.add(context.session().getActiveFamilyId(), memberMap);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponses.state(member, bootstrapService.build(context)));
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable String id, HttpServletRequest request) {
        AuthContext context = context(request);
        memberService.delete(context.session().getActiveFamilyId(), id);
        return ApiResponses.state(memberService.listView(context.session().getActiveFamilyId()).get("members"),
                bootstrapService.build(context));
    }
}
