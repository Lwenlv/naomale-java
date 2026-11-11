package com.naomale.service;

import com.naomale.common.Utils;
import com.naomale.mapper.FamilyMapper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/** 家庭级 SSE 广播；客户端按 familyId 过滤。 */
@Service
public class SseService {
    private final Map<String, List<Client>> clients = new ConcurrentHashMap<>();
    private final FamilyMapper familyMapper;

    public SseService(FamilyMapper familyMapper) {
        this.familyMapper = familyMapper;
    }

    private record Client(SseEmitter emitter, String userId) {
    }

    public SseEmitter subscribe(String userId) {
        SseEmitter emitter = new SseEmitter(0L);
        Client client = new Client(emitter, userId);
        clients.computeIfAbsent(userId, key -> new CopyOnWriteArrayList<>()).add(client);
        emitter.onCompletion(() -> remove(userId, client));
        emitter.onTimeout(() -> remove(userId, client));
        emitter.onError(error -> remove(userId, client));
        try {
            Map<String, Object> ready = new LinkedHashMap<>();
            ready.put("at", Utils.now());
            emitter.send(SseEmitter.event().name("ready").data(ready));
        } catch (Exception ignored) {
            remove(userId, client);
        }
        return emitter;
    }

    public void emit(String familyId, String type, String detail) {
        Map<String, Object> payload = payload(type, detail);
        payload.put("familyId", familyId);

        for (Map.Entry<String, List<Client>> entry : clients.entrySet()) {
            if (familyMapper.isMember(familyId, entry.getKey()) == 0) continue;
            send(entry.getKey(), entry.getValue(), payload);
        }
    }

    /** 只推送给当前账号的所有在线设备（主题这类个人设置）。 */
    public void emitToUser(String userId, String type, String detail) {
        List<Client> list = clients.get(userId);
        if (list == null) return;
        send(userId, list, payload(type, detail));
    }

    private Map<String, Object> payload(String type, String detail) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", type);
        payload.put("at", Utils.now());
        payload.put("detail", detail == null ? "" : detail);
        return payload;
    }

    private void send(String userId, List<Client> list, Map<String, Object> payload) {
        for (Client client : list) {
            try {
                client.emitter().send(SseEmitter.event().data(payload));
            } catch (Exception error) {
                remove(userId, client);
            }
        }
    }

    @Scheduled(fixedRate = 25000)
    public void heartbeat() {
        for (List<Client> list : clients.values()) {
            for (Client client : list) {
                try {
                    client.emitter().send(SseEmitter.event().comment("ping"));
                } catch (Exception error) {
                    remove(client.userId(), client);
                }
            }
        }
    }

    private void remove(String userId, Client client) {
        List<Client> list = clients.get(userId);
        if (list == null) return;
        list.remove(client);
        if (list.isEmpty()) clients.remove(userId);
    }
}
