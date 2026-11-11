package com.naomale.web;

import com.fasterxml.jackson.core.type.TypeReference;
import com.naomale.auth.AuthContext;
import com.naomale.auth.AuthSupport;
import com.naomale.common.Jsons;
import com.naomale.service.BackupService;
import com.naomale.service.BootstrapService;
import com.naomale.service.FamilyService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class BackupController {
    private final BackupService backupService;
    private final FamilyService familyService;
    private final BootstrapService bootstrapService;

    public BackupController(BackupService backupService, FamilyService familyService,
                            BootstrapService bootstrapService) {
        this.backupService = backupService;
        this.familyService = familyService;
        this.bootstrapService = bootstrapService;
    }

    private AuthContext context(HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        familyService.requireMembership(context.user().getId(), context.session().getActiveFamilyId());
        return context;
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(HttpServletRequest request) {
        AuthContext context = context(request);
        byte[] bytes = backupService.export(context.session().getActiveFamilyId()).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"naomale-backup-" + LocalDate.now() + ".json\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(bytes);
    }

    @PostMapping("/import")
    public Map<String, Object> importData(@RequestBody Object body, HttpServletRequest request) {
        AuthContext context = context(request);
        Object payload = body;
        if (body instanceof Map) {
            Map<String, Object> map = Jsons.map(body);
            if (map.get("json") instanceof String json) {
                try {
                    payload = Jsons.MAPPER.readValue(json, new TypeReference<Object>() {
                    });
                } catch (Exception error) {
                    throw com.naomale.common.AppException.badRequest("导入内容不是合法的 JSON");
                }
            }
        }
        backupService.importData(context.session().getActiveFamilyId(), payload);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("imported", true);
        return ApiResponses.state(data, bootstrapService.build(context));
    }

    @PostMapping("/reset")
    public Map<String, Object> reset(HttpServletRequest request) {
        AuthContext context = context(request);
        backupService.reset(context.session().getActiveFamilyId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("reset", true);
        return ApiResponses.state(data, bootstrapService.build(context));
    }

    @GetMapping("/backups")
    public Map<String, Object> backups(HttpServletRequest request) {
        AuthContext context = context(request);
        return ApiResponses.ok(backupService.list(context.session().getActiveFamilyId()));
    }

    @PostMapping("/backups/restore")
    public Map<String, Object> restore(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        AuthContext context = context(request);
        String file = Jsons.str(body.get("file"), "");
        if (file.isBlank()) throw com.naomale.common.AppException.badRequest("请指定要恢复的备份文件");
        backupService.restore(context.session().getActiveFamilyId(), file);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("restored", file);
        return ApiResponses.state(data, bootstrapService.build(context));
    }
}
