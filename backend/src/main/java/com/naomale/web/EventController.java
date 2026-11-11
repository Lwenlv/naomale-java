package com.naomale.web;

import com.naomale.auth.AuthContext;
import com.naomale.auth.AuthSupport;
import com.naomale.service.SseService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
public class EventController {
    private final SseService sseService;

    public EventController(SseService sseService) {
        this.sseService = sseService;
    }

    @GetMapping(value = "/api/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events(HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        return sseService.subscribe(context.user().getId());
    }
}
