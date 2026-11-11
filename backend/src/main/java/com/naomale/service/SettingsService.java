package com.naomale.service;

import com.naomale.Entities;
import com.naomale.common.Jsons;
import com.naomale.mapper.SettingsMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;

@Service
public class SettingsService {
    private static final Set<String> THEMES = Set.of("spice", "wood", "sage", "midnight", "custom");
    private static final Set<String> LEGACY_MODELS = Set.of(
            "deepseek-chat", "deepseek-reasoner", "deepseek-v3", "deepseek-v3.1", "deepseek-v3.2",
            "deepseek-v4-flash", "deepseek-v4-flash-vision-exp"
    );

    private final SettingsMapper settingsMapper;
    private final ViewService view;
    private final SseService sseService;

    public SettingsService(SettingsMapper settingsMapper, ViewService view, SseService sseService) {
        this.settingsMapper = settingsMapper;
        this.view = view;
        this.sseService = sseService;
    }

    public Entities.Settings ensure(String familyId) {
        Entities.Settings settings = settingsMapper.findByFamilyId(familyId);
        if (settings == null) {
            settings = new Entities.Settings();
            settings.setFamilyId(familyId);
            settings.setAiProvider("deepseek");
            settings.setAiModel("deepseek-flash");
            settings.setTheme("spice");
            settingsMapper.ensureDefaults(settings);
            settings = settingsMapper.findByFamilyId(familyId);
        }
        return settings;
    }

    public Map<String, Object> publicSettings(String familyId) {
        return view.publicSettings(ensure(familyId));
    }

    @Transactional
    public Map<String, Object> update(String familyId, Map<String, Object> body) {
        Entities.Settings settings = ensure(familyId);
        Map<String, Object> ai = Jsons.map(body.get("ai"));

        if (ai.get("provider") != null) {
            String provider = Jsons.str(ai.get("provider"), "deepseek");
            settings.setAiProvider("gemini".equals(provider) ? "gemini" : "deepseek");
        }
        if (ai.get("model") != null) {
            settings.setAiModel(normalizeModel(Jsons.str(ai.get("model"), "deepseek-flash")));
        }
        if (ai.containsKey("deepseekApiKey")) {
            Object value = ai.get("deepseekApiKey");
            if (value == null || String.valueOf(value).isBlank()) {
                settings.setDeepseekApiKey(null);
            } else {
                String key = String.valueOf(value).trim();
                settings.setDeepseekApiKey(key.length() > 255 ? key.substring(0, 255) : key);
            }
        }
        if (body.get("theme") != null) {
            String theme = Jsons.str(body.get("theme"), settings.getTheme());
            if (THEMES.contains(theme)) settings.setTheme(theme);
        }

        settingsMapper.update(settings);
        sseService.emit(familyId, "settings.updated", "更新系统配置");
        return view.publicSettings(settings);
    }

    public Entities.Settings raw(String familyId) {
        return ensure(familyId);
    }

    public String normalizeModel(String model) {
        String value = model == null ? "" : model.trim();
        if (value.isBlank()) return "deepseek-flash";
        return LEGACY_MODELS.contains(value) ? "deepseek-flash" : value;
    }
}
