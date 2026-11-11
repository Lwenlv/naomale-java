package com.naomale.web;

import com.naomale.Entities;
import com.naomale.auth.AuthContext;
import com.naomale.auth.AuthSupport;
import com.naomale.common.AppException;
import com.naomale.common.Jsons;
import com.naomale.service.FamilyService;
import com.naomale.service.MediaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@RestController
public class MediaController {
    private final MediaService mediaService;
    private final FamilyService familyService;

    public MediaController(MediaService mediaService, FamilyService familyService) {
        this.mediaService = mediaService;
        this.familyService = familyService;
    }

    @PostMapping("/api/media")
    public ResponseEntity<Map<String, Object>> upload(@RequestBody Map<String, Object> body,
                                                      HttpServletRequest request) {
        AuthContext context = AuthSupport.require(request);
        String familyId = context.session().getActiveFamilyId();
        familyService.requireMembership(context.user().getId(), familyId);
        Map<String, Object> result = mediaService.upload(familyId,
                Jsons.str(body.get("fileName"), ""),
                Jsons.str(body.get("dataUrl"), ""));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponses.ok(result));
    }

    @GetMapping("/media/{familyId}/{id}")
    public ResponseEntity<byte[]> serve(@PathVariable String familyId, @PathVariable String id,
                                        HttpServletRequest request) {
        AuthContext context = AuthSupport.optional(request);
        if (context == null) throw AppException.unauthorized("请先登录");
        familyService.requireMembership(context.user().getId(), familyId);
        Entities.Media media = mediaService.find(familyId, id);
        MediaType type;
        try {
            type = MediaType.parseMediaType(media.getMime());
        } catch (Exception error) {
            type = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
                .contentType(type)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                .body(media.getData());
    }
}
