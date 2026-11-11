package com.naomale.service;

import com.naomale.Entities;
import com.naomale.auth.AuthContext;
import com.naomale.mapper.BackupMapper;
import com.naomale.mapper.MediaMapper;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 组装前端启动所需的完整快照（与旧版 /api/bootstrap 完全一致）。 */
@Service
public class BootstrapService {
    private final FamilyService familyService;
    private final DishService dishService;
    private final OrderService orderService;
    private final SettingsService settingsService;
    private final ThemeService themeService;
    private final BackupMapper backupMapper;
    private final MediaMapper mediaMapper;
    private final ViewService view;

    public BootstrapService(FamilyService familyService, DishService dishService,
                            OrderService orderService, SettingsService settingsService, ThemeService themeService,
                            BackupMapper backupMapper, MediaMapper mediaMapper, ViewService view) {
        this.familyService = familyService;
        this.dishService = dishService;
        this.orderService = orderService;
        this.settingsService = settingsService;
        this.themeService = themeService;
        this.backupMapper = backupMapper;
        this.mediaMapper = mediaMapper;
        this.view = view;
    }

    public Map<String, Object> build(AuthContext context) {
        return build(context.user(), context.session());
    }

    public Map<String, Object> build(Entities.User user, Entities.Session session) {
        String familyId = session.getActiveFamilyId();
        if (familyId == null || familyId.isBlank()) {
            List<Entities.Family> families = familyService.listForUser(user.getId());
            if (families.isEmpty()) {
                Entities.Family family = familyService.create(user, user.getDisplayName() + "的家庭");
                familyId = family.getId();
                session.setActiveFamilyId(familyId);
            } else {
                familyId = families.get(0).getId();
                session.setActiveFamilyId(familyId);
            }
        }
        Entities.Family family = familyService.requireMembership(user.getId(), familyId);

        List<Entities.Dish> dishes = dishService.list(familyId);
        List<Entities.FamilyMemberRow> accountMembers = familyService.accountMembers(user.getId(), familyId);
        Map<String, Object> currentOrder = orderService.currentView(familyId);
        List<Map<String, Object>> history = orderService.historyViews(familyId);
        Map<String, Object> settings = settingsService.publicSettings(familyId);
        settings.put("theme", themeService.activeTheme(user.getId()));
        settings.put("customTheme", themeService.get(user.getId()));

        int media = mediaMapper.count(familyId);
        int backups = backupMapper.count(familyId);
        Map<String, Object> meta = view.meta(family, dishes.size(), accountMembers.size(), history.size(), media, backups,
                com.naomale.common.Utils.now());
        Map<String, Object> auth = view.auth(user, familyService.summaries(user.getId()), familyId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("schemaVersion", 1);
        result.put("dishes", view.dishes(dishes));
        result.put("members", view.accountMembers(accountMembers));
        result.put("ordersHistory", history);
        result.put("currentOrder", currentOrder);
        result.put("settings", settings);
        result.put("meta", meta);
        result.put("auth", auth);
        return result;
    }

    public Map<String, Object> authState(Entities.User user, Entities.Session session) {
        String familyId = session.getActiveFamilyId();
        return view.auth(user, familyService.summaries(user.getId()), familyId);
    }
}
