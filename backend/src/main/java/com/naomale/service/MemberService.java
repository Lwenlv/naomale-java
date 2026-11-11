package com.naomale.service;

import com.naomale.Entities;
import com.naomale.common.AppException;
import com.naomale.common.Jsons;
import com.naomale.mapper.MealMemberMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class MemberService {
    private final MealMemberMapper memberMapper;
    private final DataNormalizer normalizer;
    private final SseService sseService;
    private final ViewService view;

    public MemberService(MealMemberMapper memberMapper, DataNormalizer normalizer,
                         SseService sseService, ViewService view) {
        this.memberMapper = memberMapper;
        this.normalizer = normalizer;
        this.sseService = sseService;
        this.view = view;
    }

    public List<Entities.MealMember> list(String familyId) {
        return memberMapper.listByFamily(familyId);
    }

    public Map<String, Object> listView(String familyId) {
        return Map.of("members", view.members(list(familyId)));
    }

    @Transactional
    public List<Entities.MealMember> replace(String familyId, List<Object> rawMembers) {
        List<Entities.MealMember> members = new ArrayList<>();
        int index = 0;
        for (Object raw : rawMembers == null ? List.of() : rawMembers) {
            Map<String, Object> map = Jsons.map(raw);
            if (Jsons.str(map.get("name"), "").isBlank()) continue;
            members.add(normalizer.member(map, familyId, index++));
            if (members.size() >= 20) break;
        }
        if (members.isEmpty()) throw AppException.badRequest("至少需要保留一位家庭成员");
        memberMapper.deleteByFamily(familyId);
        for (Entities.MealMember member : members) memberMapper.insert(member);
        sseService.emit(familyId, "members.updated", "共 " + members.size() + " 位成员");
        return members;
    }

    @Transactional
    public Entities.MealMember add(String familyId, Map<String, Object> input) {
        int count = memberMapper.count(familyId);
        if (count >= 20) throw AppException.badRequest("成员数量已达上限");
        Entities.MealMember member = normalizer.member(input, familyId, count);
        memberMapper.insert(member);
        sseService.emit(familyId, "member.created", member.getName());
        return member;
    }

    @Transactional
    public List<Entities.MealMember> delete(String familyId, String id) {
        List<Entities.MealMember> existing = memberMapper.listByFamily(familyId);
        if (existing.size() <= 1) throw AppException.badRequest("至少需要保留一位家庭成员");
        Entities.MealMember target = existing.stream().filter(item -> item.getId().equals(id)).findFirst()
                .orElseThrow(() -> AppException.notFound("成员不存在"));
        memberMapper.delete(familyId, id);
        sseService.emit(familyId, "member.deleted", target.getName());
        return memberMapper.listByFamily(familyId);
    }
}
