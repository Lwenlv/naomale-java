package com.naomale.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.naomale.Entities;
import com.naomale.common.AppException;
import com.naomale.common.Jsons;
import com.naomale.common.Utils;
import com.naomale.mapper.MediaMapper;
import com.naomale.mapper.ThemeMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** 家庭自定义主题包：多图素材、位置分配、AI/本地配色。 */
@Service
public class ThemeService {
    private static final String[] SLOT_KEYS = {
            "logo", "hero", "background",
            "navGallery", "navOrder", "navRandom", "navNutrition", "navStats"
    };
    private static final String DEFAULT_PRIMARY = "#e8a317";

    private final ThemeMapper themeMapper;
    private final MediaMapper mediaMapper;
    private final SettingsService settingsService;
    private final DeepSeekClient deepSeekClient;
    private final SseService sseService;

    public ThemeService(ThemeMapper themeMapper, MediaMapper mediaMapper,
                        SettingsService settingsService, DeepSeekClient deepSeekClient,
                        SseService sseService) {
        this.themeMapper = themeMapper;
        this.mediaMapper = mediaMapper;
        this.settingsService = settingsService;
        this.deepSeekClient = deepSeekClient;
        this.sseService = sseService;
    }

    public String activeTheme(String userId) {
        Entities.Theme row = themeMapper.findByUserId(userId);
        if (row == null) return "spice";
        String theme = row.getActiveTheme();
        if ("custom".equals(theme) && (row.getConfig() == null || row.getConfig().isBlank())) return "spice";
        if (theme == null || theme.isBlank()) return "spice";
        return theme;
    }

    public Map<String, Object> get(String userId) {
        Entities.Theme row = themeMapper.findByUserId(userId);
        if (row == null || row.getConfig() == null || row.getConfig().isBlank()) return null;
        try {
            return Jsons.MAPPER.readValue(row.getConfig(), new TypeReference<>() {
            });
        } catch (Exception ignored) {
            return null;
        }
    }

    @Transactional
    public Map<String, Object> save(String userId, String familyId, Map<String, Object> body) {
        Map<String, Object> config = sanitize(familyId, body);
        upsert(userId, "custom", Jsons.str(config.get("name"), "自定义主题"), Jsons.write(config));
        sseService.emitToUser(userId, "theme.updated", "自定义主题已更新");
        return config;
    }

    @Transactional
    public void setActive(String userId, String theme) {
        String value = theme == null ? "" : theme.trim();
        if (!Set.of("spice", "wood", "sage", "midnight", "custom").contains(value)) {
            throw AppException.badRequest("未知的主题");
        }
        Entities.Theme row = themeMapper.findByUserId(userId);
        if ("custom".equals(value)) {
            if (row == null || row.getConfig() == null || row.getConfig().isBlank()) {
                throw AppException.badRequest("还没有自定义主题，请先在主题工坊创建");
            }
            upsert(userId, "custom", row.getName(), row.getConfig());
        } else if (row != null) {
            upsert(userId, value, row.getName(), row.getConfig());
        } else {
            upsert(userId, value, null, null);
        }
        sseService.emitToUser(userId, "theme.updated", "主题已切换");
    }

    @Transactional
    public void clear(String userId) {
        themeMapper.deleteByUserId(userId);
        sseService.emitToUser(userId, "theme.updated", "已恢复默认主题");
    }

    private void upsert(String userId, String activeTheme, String name, String config) {
        Entities.Theme row = new Entities.Theme();
        row.setUserId(userId);
        row.setActiveTheme(activeTheme);
        row.setName(name);
        row.setConfig(config);
        row.setUpdatedAt(Utils.now());
        themeMapper.upsert(row);
    }

    /** 从已上传到当前家庭的图片中提取配色。AI 失败时回退到本地取色。 */
    public Map<String, Object> analyze(String familyId, List<String> imageUrls) {
        List<Entities.Media> images = new ArrayList<>();
        for (String url : imageUrls == null ? List.<String>of() : imageUrls) {
            Entities.Media media = resolveMedia(familyId, url);
            if (media != null) images.add(media);
            if (images.size() >= 3) break;
        }
        if (images.isEmpty()) throw AppException.badRequest("请先上传至少一张主题图片");

        if (settingsService.raw(familyId).getDeepseekApiKey() != null) {
            try {
                Map<String, Object> ai = analyzeWithAI(familyId, images);
                if (ai != null) return ai;
            } catch (Exception ignored) {
                // 网络/模型失败时继续本地取色，保证主题工坊可用
            }
        }
        return localPalette(images);
    }

    private Map<String, Object> analyzeWithAI(String familyId, List<Entities.Media> images) {
        StringBuilder prompt = new StringBuilder("""
                请分析这些图片，为家庭点餐应用生成一套完整主题配色。
                图片可能是同一角色/同一色调的多张壁纸。请提取主色、辅色、背景、卡片、导航和文字颜色。
                只输出严格合法的 JSON，不要在 JSON 外写任何解释：
                {
                  "name": "主题名称，中文，12 字以内",
                  "palette": {
                    "isDark": false,
                    "primary": "#RRGGBB",
                    "primaryHover": "#RRGGBB",
                    "primaryLight": "#RRGGBB",
                    "primaryDark": "#RRGGBB",
                    "accent": "#RRGGBB",
                    "background": "#RRGGBB",
                    "surface": "#RRGGBB",
                    "text": "#RRGGBB",
                    "muted": "#RRGGBB",
                    "nav": "#RRGGBB",
                    "overlay": 0.4
                  }
                }
                配色要求：主色要来自图片中最有辨识度的颜色；文字与背景必须有足够对比度；overlay 在 0.25~0.65 之间。
                """);
        List<Map<String, Object>> parts = new ArrayList<>();
        parts.add(Map.of("type", "text", "text", prompt.toString()));
        for (Entities.Media media : images) {
            String dataUrl = "data:" + media.getMime() + ";base64,"
                    + Base64.getEncoder().encodeToString(media.getData());
            parts.add(Map.of("type", "image_url", "image_url", Map.of("url", dataUrl, "detail", "low")));
        }
        List<Map<String, Object>> messages = List.of(
                Map.of("role", "system", "content",
                        "你是专业视觉设计师，擅长从图片提取统一、可用的产品主题配色。只输出 JSON。"),
                Map.of("role", "user", "content", parts)
        );
        String content = deepSeekClient.chat(settingsService.raw(familyId), messages, true, 0.2, 900);
        Map<String, Object> parsed = extractJson(content);
        Map<String, Object> palette = Jsons.map(parsed.get("palette"));
        if (palette.isEmpty()) palette = parsed;
        Map<String, Object> normalized = normalizePalette(palette, Color.decode(DEFAULT_PRIMARY));
        normalized.put("source", "ai");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("name", Jsons.str(parsed.get("name"), "AI 主题"));
        result.put("palette", normalized);
        return result;
    }

    private Map<String, Object> localPalette(List<Entities.Media> images) {
        long red = 0, green = 0, blue = 0, count = 0;
        for (Entities.Media media : images) {
            try {
                BufferedImage image = ImageIO.read(new ByteArrayInputStream(media.getData()));
                if (image == null) continue;
                int stepX = Math.max(1, image.getWidth() / 36);
                int stepY = Math.max(1, image.getHeight() / 36);
                for (int y = 0; y < image.getHeight(); y += stepY) {
                    for (int x = 0; x < image.getWidth(); x += stepX) {
                        Color color = new Color(image.getRGB(x, y));
                        float[] hsb = Color.RGBtoHSB(color.getRed(), color.getGreen(), color.getBlue(), null);
                        if (hsb[2] < 0.08 || hsb[2] > 0.98) continue;
                        if (hsb[1] < 0.08) continue;
                        red += color.getRed();
                        green += color.getGreen();
                        blue += color.getBlue();
                        count++;
                    }
                }
            } catch (Exception ignored) {
                // 跳过损坏图片
            }
        }
        Color primary = count > 0
                ? new Color((int) (red / count), (int) (green / count), (int) (blue / count))
                : Color.decode(DEFAULT_PRIMARY);
        Map<String, Object> palette = normalizePalette(new LinkedHashMap<>(), primary);
        palette.put("source", "local");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("name", "图片主题");
        result.put("palette", palette);
        return result;
    }

    private Map<String, Object> sanitize(String familyId, Map<String, Object> body) {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("name", cut(Jsons.str(body.get("name"), "自定义主题"), 24));

        List<String> images = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (Object raw : Jsons.list(body.get("images"))) {
            String url = Jsons.str(raw, "");
            if (!isOwned(familyId, url) || !seen.add(url)) continue;
            images.add(url);
            if (images.size() >= 12) break;
        }
        if (images.isEmpty()) throw AppException.badRequest("请先上传主题图片");

        Map<String, Object> slots = new LinkedHashMap<>();
        Map<String, Object> rawSlots = Jsons.map(body.get("slots"));
        for (String key : SLOT_KEYS) {
            String url = Jsons.str(rawSlots.get(key), "");
            if (isOwned(familyId, url) && images.contains(url)) slots.put(key, url);
        }

        Map<String, Object> palette = normalizePalette(Jsons.map(body.get("palette")), Color.decode(DEFAULT_PRIMARY));
        config.put("images", images);
        config.put("slots", slots);
        config.put("palette", palette);
        return config;
    }

    private Map<String, Object> normalizePalette(Map<String, Object> raw, Color fallback) {
        Color primary = parseColor(raw.get("primary"), fallback);
        Color hover = parseColor(raw.get("primaryHover"), shade(primary, 0.84));
        Color light = parseColor(raw.get("primaryLight"), mix(primary, Color.WHITE, 0.82));
        Color dark = parseColor(raw.get("primaryDark"), shade(primary, 0.62));
        Color accent = parseColor(raw.get("accent"), shiftHue(primary, 0.07, 0.95));
        boolean isDark = Jsons.bool(raw.get("isDark"), brightness(primary) < 0.42);
        Color background = parseColor(raw.get("background"),
                isDark ? mix(dark, Color.BLACK, 0.72) : mix(light, Color.WHITE, 0.72));
        Color surface = parseColor(raw.get("surface"),
                isDark ? mix(background, Color.WHITE, 0.08) : Color.WHITE);
        Color text = parseColor(raw.get("text"),
                isDark ? new Color(0xF8FAFC) : mix(primary, Color.BLACK, 0.78));
        Color muted = parseColor(raw.get("muted"),
                isDark ? mix(text, background, 0.48) : mix(text, Color.WHITE, 0.42));
        Color nav = parseColor(raw.get("nav"), background);

        Map<String, Object> palette = new LinkedHashMap<>();
        palette.put("isDark", isDark);
        palette.put("primary", hex(primary));
        palette.put("primaryHover", hex(hover));
        palette.put("primaryLight", hex(light));
        palette.put("primaryDark", hex(dark));
        palette.put("accent", hex(accent));
        palette.put("background", hex(background));
        palette.put("surface", hex(surface));
        palette.put("text", hex(text));
        palette.put("muted", hex(muted));
        palette.put("nav", hex(nav));
        palette.put("overlay", Math.max(0.2, Math.min(0.7, Jsons.dbl(raw.get("overlay"), isDark ? 0.5 : 0.35))));
        String source = Jsons.str(raw.get("source"), "");
        if ("ai".equals(source) || "local".equals(source)) palette.put("source", source);
        return palette;
    }

    private Entities.Media resolveMedia(String familyId, String url) {
        if (!isOwned(familyId, url)) return null;
        String[] parts = url.split("/");
        if (parts.length < 4) return null;
        return mediaMapper.find(familyId, parts[parts.length - 1]);
    }

    private boolean isOwned(String familyId, String url) {
        return url != null && url.startsWith("/media/" + familyId + "/") && url.length() < 500;
    }

    private Map<String, Object> extractJson(String text) {
        String cleaned = text.replaceAll("(?i)```json", "").replace("```", "").trim();
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        if (start < 0 || end <= start) throw new AppException(502, "AI 没有返回 JSON");
        try {
            return Jsons.MAPPER.readValue(cleaned.substring(start, end + 1), new TypeReference<>() {
            });
        } catch (Exception error) {
            throw new AppException(502, "AI 配色 JSON 格式不正确");
        }
    }

    private Color parseColor(Object value, Color fallback) {
        String text = Jsons.str(value, "");
        if (text.matches("^#[0-9a-fA-F]{6}$")) {
            try {
                return Color.decode(text);
            } catch (Exception ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private Color mix(Color a, Color b, double ratio) {
        double keep = 1 - ratio;
        return new Color(
                (int) Math.round(a.getRed() * keep + b.getRed() * ratio),
                (int) Math.round(a.getGreen() * keep + b.getGreen() * ratio),
                (int) Math.round(a.getBlue() * keep + b.getBlue() * ratio)
        );
    }

    private Color shade(Color color, double factor) {
        return mix(color, Color.BLACK, 1 - factor);
    }

    private Color shiftHue(Color color, double shift, double saturationFactor) {
        float[] hsb = Color.RGBtoHSB(color.getRed(), color.getGreen(), color.getBlue(), null);
        return Color.getHSBColor((hsb[0] + (float) shift) % 1f,
                Math.min(1f, hsb[1] * (float) saturationFactor), hsb[2]);
    }

    private double brightness(Color color) {
        return (0.299 * color.getRed() + 0.587 * color.getGreen() + 0.114 * color.getBlue()) / 255.0;
    }

    private String hex(Color color) {
        return String.format("#%02x%02x%02x", color.getRed(), color.getGreen(), color.getBlue());
    }

    private String cut(String value, int max) {
        if (value == null) return "";
        String text = value.trim();
        return text.length() <= max ? text : text.substring(0, max);
    }
}
