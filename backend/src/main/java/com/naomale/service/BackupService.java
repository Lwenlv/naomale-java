package com.naomale.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.naomale.Entities;
import com.naomale.common.AppException;
import com.naomale.common.Jsons;
import com.naomale.common.Utils;
import com.naomale.mapper.BackupMapper;
import com.naomale.mapper.DishMapper;
import com.naomale.mapper.MealMemberMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class BackupService {
    private static final int KEEP = 30;

    private final BackupMapper backupMapper;
    private final DishMapper dishMapper;
    private final MealMemberMapper memberMapper;
    private final DishService dishService;
    private final MemberService memberService;
    private final OrderService orderService;
    private final SettingsService settingsService;
    private final DataNormalizer normalizer;
    private final ViewService view;
    private final SseService sseService;

    public BackupService(BackupMapper backupMapper, DishMapper dishMapper, MealMemberMapper memberMapper,
                         DishService dishService, MemberService memberService, OrderService orderService,
                         SettingsService settingsService, DataNormalizer normalizer, ViewService view,
                         SseService sseService) {
        this.backupMapper = backupMapper;
        this.dishMapper = dishMapper;
        this.memberMapper = memberMapper;
        this.dishService = dishService;
        this.memberService = memberService;
        this.orderService = orderService;
        this.settingsService = settingsService;
        this.normalizer = normalizer;
        this.view = view;
        this.sseService = sseService;
    }

    public Map<String, Object> snapshot(String familyId, boolean includeKey, String reason) {
        Entities.Settings settings = settingsService.raw(familyId);
        Map<String, Object> ai = new LinkedHashMap<>();
        ai.put("provider", settings.getAiProvider());
        ai.put("model", settings.getAiModel());
        if (includeKey && settings.getDeepseekApiKey() != null) {
            ai.put("deepseekApiKey", settings.getDeepseekApiKey());
        }
        Map<String, Object> settingsMap = new LinkedHashMap<>();
        settingsMap.put("ai", ai);
        settingsMap.put("theme", settings.getTheme());

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("app", "闹麻了点单");
        snapshot.put("schemaVersion", 1);
        snapshot.put("exportedAt", Utils.now());
        snapshot.put("reason", reason == null ? "" : reason);
        snapshot.put("dishes", view.dishes(dishService.list(familyId)));
        snapshot.put("members", view.members(memberService.list(familyId)));
        snapshot.put("ordersHistory", orderService.historyViews(familyId));
        snapshot.put("currentOrder", orderService.currentView(familyId));
        snapshot.put("settings", settingsMap);
        return snapshot;
    }

    @Transactional
    public Entities.Backup create(String familyId, String reason) {
        Entities.Backup backup = new Entities.Backup();
        backup.setId(Utils.uuid());
        backup.setFamilyId(familyId);
        backup.setReason(reason);
        backup.setPayload(Jsons.write(snapshot(familyId, true, reason)));
        backup.setCreatedAt(Utils.now());
        backupMapper.insert(backup);
        backupMapper.deleteOld(familyId, KEEP);
        return backup;
    }

    public List<Map<String, Object>> list(String familyId) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Entities.Backup backup : backupMapper.listByFamily(familyId)) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("file", backup.getId());
            item.put("createdAt", backup.getCreatedAt());
            item.put("bytes", backup.getSize() == null ? 0 : backup.getSize());
            result.add(item);
        }
        return result;
    }

    public String export(String familyId) {
        return Jsons.write(snapshot(familyId, false, "导出备份"));
    }

    @Transactional
    public void importData(String familyId, Object payload) {
        Map<String, Object> bundle = normalizeBundle(payload);
        create(familyId, "导入前");
        replaceAll(familyId, bundle);
        sseService.emit(familyId, "data.imported", "导入备份");
    }

    @Transactional
    public void restore(String familyId, String backupId) {
        Entities.Backup backup = backupMapper.find(familyId, backupId);
        if (backup == null) throw AppException.notFound("备份文件不存在");
        Map<String, Object> bundle;
        try {
            bundle = Jsons.MAPPER.readValue(backup.getPayload(), new TypeReference<>() {
            });
        } catch (Exception error) {
            throw AppException.badRequest("备份文件已损坏，无法恢复");
        }
        create(familyId, "恢复备份前");
        replaceAll(familyId, bundle);
        sseService.emit(familyId, "data.restored", "从备份恢复");
    }

    @Transactional
    public void reset(String familyId) {
        create(familyId, "清空数据前");
        orderService.deleteAll(familyId);
        dishMapper.deleteByFamily(familyId);
        memberMapper.deleteByFamily(familyId);

        Entities.MealMember member = new Entities.MealMember();
        member.setId(Utils.uuid());
        member.setFamilyId(familyId);
        member.setName("我");
        member.setRole("点单人");
        member.setAvatarBg("bg-amber-600");
        member.setDietaryPreference("无特殊忌口");
        member.setSortOrder(0);
        memberMapper.insert(member);

        orderService.ensureCurrent(familyId);
        sseService.emit(familyId, "data.reset", "清空全部业务数据");
    }

    private Map<String, Object> normalizeBundle(Object payload) {
        Map<String, Object> bundle;
        if (payload instanceof String text) {
            try {
                bundle = Jsons.MAPPER.readValue(text, new TypeReference<>() {
                });
            } catch (Exception error) {
                throw AppException.badRequest("导入内容不是合法的 JSON");
            }
        } else {
            bundle = Jsons.map(payload);
        }
        if (!(bundle.get("dishes") instanceof List)) {
            throw AppException.badRequest("备份文件缺少 dishes 菜谱数据，无法导入");
        }
        return bundle;
    }

    @SuppressWarnings("unchecked")
    private void replaceAll(String familyId, Map<String, Object> bundle) {
        orderService.deleteAll(familyId);
        dishMapper.deleteByFamily(familyId);
        memberMapper.deleteByFamily(familyId);

        Map<String, Map<String, Object>> dishesById = new LinkedHashMap<>();
        for (Object raw : Jsons.list(bundle.get("dishes"))) {
            Map<String, Object> map = Jsons.map(raw);
            if (Jsons.str(map.get("name"), "").isBlank()) continue;
            Entities.Dish dish = normalizer.dish(map, familyId, null);
            dishMapper.insert(dish);
            dishesById.put(dish.getId(), view.dish(dish));
        }

        int memberIndex = 0;
        for (Object raw : Jsons.list(bundle.get("members"))) {
            Map<String, Object> map = Jsons.map(raw);
            if (Jsons.str(map.get("name"), "").isBlank()) continue;
            memberMapper.insert(normalizer.member(map, familyId, memberIndex++));
        }
        if (memberIndex == 0) {
            Entities.MealMember member = new Entities.MealMember();
            member.setId(Utils.uuid());
            member.setFamilyId(familyId);
            member.setName("我");
            member.setRole("点单人");
            member.setAvatarBg("bg-amber-600");
            member.setDietaryPreference("无特殊忌口");
            member.setSortOrder(0);
            memberMapper.insert(member);
        }

        for (Object raw : Jsons.list(bundle.get("ordersHistory"))) {
            Map<String, Object> map = Jsons.map(raw);
            if (Jsons.str(map.get("title"), "").isBlank()) continue;
            orderService.importOrder(familyId, map, false, dishesById);
        }

        Object current = bundle.get("currentOrder");
        if (current instanceof Map) {
            orderService.importOrder(familyId, Jsons.map(current), true, dishesById);
        } else {
            orderService.ensureCurrent(familyId);
        }

        Map<String, Object> settings = Jsons.map(bundle.get("settings"));
        Map<String, Object> ai = Jsons.map(settings.get("ai"));
        Map<String, Object> patch = new LinkedHashMap<>();
        Map<String, Object> aiPatch = new LinkedHashMap<>();
        if (ai.get("provider") != null) aiPatch.put("provider", ai.get("provider"));
        if (ai.get("model") != null) aiPatch.put("model", ai.get("model"));
        if (ai.get("deepseekApiKey") != null) aiPatch.put("deepseekApiKey", ai.get("deepseekApiKey"));
        patch.put("ai", aiPatch);
        if (settings.get("theme") != null) patch.put("theme", settings.get("theme"));
        settingsService.update(familyId, patch);
    }

    public int count(String familyId) {
        return backupMapper.count(familyId);
    }
}
