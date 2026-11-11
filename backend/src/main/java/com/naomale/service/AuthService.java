package com.naomale.service;

import com.naomale.Entities;
import com.naomale.auth.AuthContext;
import com.naomale.common.AppException;
import com.naomale.common.Utils;
import com.naomale.mapper.FamilyMapper;
import com.naomale.mapper.SessionMapper;
import com.naomale.mapper.UserMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class AuthService {
    private static final int SESSION_DAYS = 30;
    private static final String USERNAME_PATTERN = "^[\\p{IsHan}A-Za-z0-9_-]{2,24}$";

    private final UserMapper userMapper;
    private final SessionMapper sessionMapper;
    private final FamilyMapper familyMapper;
    private final FamilyService familyService;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthService(UserMapper userMapper, SessionMapper sessionMapper,
                       FamilyMapper familyMapper, FamilyService familyService) {
        this.userMapper = userMapper;
        this.sessionMapper = sessionMapper;
        this.familyMapper = familyMapper;
        this.familyService = familyService;
    }

    public record Result(Entities.User user, String token, String familyId) {
    }

    @Transactional
    public Result register(String usernameRaw, String password, String displayName) {
        String username = usernameRaw == null ? "" : usernameRaw.trim();
        if (!username.matches(USERNAME_PATTERN)) {
            throw AppException.badRequest("用户名需为 2-24 位中文、字母、数字、下划线或短横线");
        }
        if (password == null || password.length() < 6) throw AppException.badRequest("密码至少 6 位");
        if (password.length() > 72) throw AppException.badRequest("密码不能超过 72 位");
        if (userMapper.findByUsername(username) != null) throw AppException.conflict("该用户名已被注册");

        Entities.User user = new Entities.User();
        user.setId(Utils.uuid());
        user.setUsername(username);
        String nickname = displayName == null || displayName.isBlank() ? username : displayName.trim();
        user.setDisplayName(nickname.length() > 24 ? nickname.substring(0, 24) : nickname);
        user.setPasswordHash(encoder.encode(password));
        user.setCreatedAt(Utils.now());
        userMapper.insert(user);

        Entities.Family family = familyService.create(user, user.getDisplayName() + "的家庭");
        String token = createSession(user.getId(), family.getId());
        return new Result(user, token, family.getId());
    }

    @Transactional
    public Result login(String usernameRaw, String password) {
        String username = usernameRaw == null ? "" : usernameRaw.trim();
        if (username.isBlank() || password == null || password.isBlank()) {
            throw AppException.badRequest("请输入用户名和密码");
        }
        Entities.User user = userMapper.findByUsername(username);
        if (user == null || !encoder.matches(password, user.getPasswordHash())) {
            throw AppException.unauthorized("用户名或密码不正确");
        }
        List<Entities.Family> families = familyMapper.listByUser(user.getId());
        Entities.Family family = families.isEmpty() ? familyService.create(user, user.getDisplayName() + "的家庭") : families.get(0);
        String token = createSession(user.getId(), family.getId());
        return new Result(user, token, family.getId());
    }

    public void logout(String token) {
        if (token == null || token.isBlank()) return;
        sessionMapper.deleteByTokenHash(Utils.sha256(token));
    }

    /** 解析 Cookie 中的 token；同时把失效的 activeFamilyId 回退到第一个家庭。 */
    public AuthContext resolve(String token) {
        if (token == null || token.isBlank()) return null;
        Entities.Session session = sessionMapper.findByTokenHash(Utils.sha256(token));
        if (session == null) return null;
        try {
            if (Instant.parse(session.getExpiresAt()).isBefore(Instant.now())) {
                sessionMapper.deleteByTokenHash(session.getTokenHash());
                return null;
            }
        } catch (Exception ignored) {
            return null;
        }
        Entities.User user = userMapper.findById(session.getUserId());
        if (user == null) return null;

        String active = session.getActiveFamilyId();
        if (active == null || familyMapper.isMember(active, user.getId()) == 0) {
            List<Entities.Family> families = familyMapper.listByUser(user.getId());
            if (!families.isEmpty()) {
                active = families.get(0).getId();
                session.setActiveFamilyId(active);
                sessionMapper.updateActiveFamily(session.getTokenHash(), active);
            } else {
                session.setActiveFamilyId(null);
            }
        }
        return new AuthContext(user, session);
    }

    private String createSession(String userId, String familyId) {
        String token = Utils.newSessionToken();
        Entities.Session session = new Entities.Session();
        session.setTokenHash(Utils.sha256(token));
        session.setUserId(userId);
        session.setActiveFamilyId(familyId);
        session.setCreatedAt(Utils.now());
        session.setExpiresAt(Utils.expiresInDays(SESSION_DAYS));
        sessionMapper.insert(session);
        return token;
    }

    public long userCount() {
        return userMapper.count();
    }
}
