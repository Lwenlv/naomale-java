package com.naomale.service;

import com.naomale.Entities;
import com.naomale.common.AppException;
import com.naomale.common.Utils;
import com.naomale.mapper.FamilyMapper;
import com.naomale.mapper.MealMemberMapper;
import com.naomale.mapper.SessionMapper;
import com.naomale.mapper.SettingsMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class FamilyService {
    private final FamilyMapper familyMapper;
    private final SettingsMapper settingsMapper;
    private final MealMemberMapper mealMemberMapper;
    private final SessionMapper sessionMapper;
    private final ViewService view;

    public FamilyService(FamilyMapper familyMapper, SettingsMapper settingsMapper,
                         MealMemberMapper mealMemberMapper, SessionMapper sessionMapper, ViewService view) {
        this.familyMapper = familyMapper;
        this.settingsMapper = settingsMapper;
        this.mealMemberMapper = mealMemberMapper;
        this.sessionMapper = sessionMapper;
        this.view = view;
    }

    @Transactional
    public Entities.Family create(Entities.User owner, String name) {
        String invite;
        do {
            invite = Utils.inviteCode();
        } while (familyMapper.findByInviteCode(invite) != null);

        Entities.Family family = new Entities.Family();
        family.setId(Utils.uuid());
        family.setName(trim(name, owner.getDisplayName() + "的家庭"));
        family.setOwnerId(owner.getId());
        family.setInviteCode(invite);
        family.setCreatedAt(Utils.now());
        familyMapper.insert(family);
        familyMapper.addMember(family.getId(), owner.getId(), "owner", Utils.now());

        Entities.Settings settings = new Entities.Settings();
        settings.setFamilyId(family.getId());
        settings.setAiProvider("deepseek");
        settings.setAiModel("deepseek-flash");
        settings.setDeepseekApiKey(null);
        settings.setTheme("spice");
        settingsMapper.ensureDefaults(settings);

        Entities.MealMember member = new Entities.MealMember();
        member.setId(Utils.uuid());
        member.setFamilyId(family.getId());
        member.setName("我");
        member.setRole("点单人");
        member.setAvatarBg("bg-amber-600");
        member.setDietaryPreference("无特殊忌口");
        member.setSortOrder(0);
        mealMemberMapper.insert(member);

        return family;
    }

    public List<Entities.Family> listForUser(String userId) {
        return familyMapper.listByUser(userId);
    }

    public List<Map<String, Object>> summaries(String userId) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Entities.Family family : familyMapper.listByUser(userId)) {
            String role = family.getOwnerId().equals(userId) ? "owner" : "member";
            result.add(view.family(family, role, familyMapper.countMembers(family.getId())));
        }
        return result;
    }

    public Entities.Family requireMembership(String userId, String familyId) {
        if (familyId == null || familyId.isBlank()) throw new AppException(409, "请先创建或加入一个家庭");
        if (familyMapper.isMember(familyId, userId) == 0) {
            throw AppException.forbidden("你不是这个家庭的成员");
        }
        Entities.Family family = familyMapper.findById(familyId);
        if (family == null) throw AppException.notFound("家庭不存在");
        return family;
    }

    @Transactional
    public Entities.Family join(Entities.User user, String inviteCode) {
        String code = inviteCode == null ? "" : inviteCode.trim().toUpperCase();
        if (code.isBlank()) throw AppException.badRequest("请输入邀请码");
        Entities.Family family = familyMapper.findByInviteCode(code);
        if (family == null) throw AppException.notFound("邀请码无效或已失效");
        if (familyMapper.isMember(family.getId(), user.getId()) > 0) return family;
        if (familyMapper.listByUser(user.getId()).size() >= 10) {
            throw AppException.badRequest("最多加入 10 个家庭");
        }
        familyMapper.addMember(family.getId(), user.getId(), "member", Utils.now());
        settingsMapper.ensureDefaults(defaults(family.getId()));
        return family;
    }

    public Entities.Family switchFamily(Entities.Session session, String familyId) {
        Entities.Family family = requireMembership(session.getUserId(), familyId);
        sessionMapper.updateActiveFamily(session.getTokenHash(), familyId);
        session.setActiveFamilyId(familyId);
        return family;
    }

    public String invite(String userId, String familyId) {
        return requireMembership(userId, familyId).getInviteCode();
    }

    public List<Entities.FamilyMemberRow> members(String userId, String familyId) {
        requireMembership(userId, familyId);
        return familyMapper.listMembers(familyId);
    }

    /** 点单/分餐使用登录账号成员，不再维护一套独立的“点菜成员”。 */
    public List<Entities.FamilyMemberRow> accountMembers(String userId, String familyId) {
        return members(userId, familyId);
    }

    public Entities.Settings defaults(String familyId) {
        Entities.Settings settings = new Entities.Settings();
        settings.setFamilyId(familyId);
        settings.setAiProvider("deepseek");
        settings.setAiModel("deepseek-flash");
        settings.setTheme("spice");
        return settings;
    }

    private String trim(String value, String fallback) {
        String text = value == null ? "" : value.trim();
        if (text.isEmpty()) text = fallback;
        return text.length() > 24 ? text.substring(0, 24) : text;
    }
}
