package com.naomale.service;

import com.naomale.Entities;
import com.naomale.common.AppException;
import com.naomale.common.Utils;
import com.naomale.mapper.MediaMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MediaService {
    private static final int MAX_BYTES = 8 * 1024 * 1024;
    private static final Pattern DATA_URL = Pattern.compile("^data:(image/[a-z+.-]+);base64,(.+)$", Pattern.CASE_INSENSITIVE);

    private final MediaMapper mediaMapper;

    public MediaService(MediaMapper mediaMapper) {
        this.mediaMapper = mediaMapper;
    }

    @Transactional
    public Map<String, Object> upload(String familyId, String fileName, String dataUrl) {
        if (dataUrl == null || !dataUrl.startsWith("data:")) {
            throw AppException.badRequest("图片数据格式不正确（需要 dataURL）");
        }
        Matcher matcher = DATA_URL.matcher(dataUrl);
        if (!matcher.matches()) throw AppException.badRequest("仅支持 base64 编码的图片数据");
        String mime = matcher.group(1).toLowerCase();
        if (!mime.matches("image/(png|jpe?g|webp|gif)")) {
            throw AppException.badRequest("仅支持 PNG / JPEG / WebP / GIF 图片");
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(matcher.group(2).replaceAll("\\s", ""));
        } catch (Exception error) {
            throw AppException.badRequest("图片 base64 解码失败");
        }
        if (bytes.length == 0) throw AppException.badRequest("图片内容为空");
        if (bytes.length > MAX_BYTES) throw new AppException(413, "图片不能超过 8MB");

        Entities.Media media = new Entities.Media();
        media.setId(Utils.uuid());
        media.setFamilyId(familyId);
        media.setMime(mime);
        media.setFileName(fileName);
        media.setData(bytes);
        media.setBytes(bytes.length);
        media.setCreatedAt(Utils.now());
        mediaMapper.insert(media);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("url", "/media/" + familyId + "/" + media.getId());
        result.put("file", media.getId());
        result.put("bytes", bytes.length);
        return result;
    }

    public Entities.Media find(String familyId, String id) {
        Entities.Media media = mediaMapper.find(familyId, id);
        if (media == null) throw AppException.notFound("图片不存在");
        return media;
    }
}
