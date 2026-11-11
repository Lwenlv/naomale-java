package com.naomale.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.naomale.Entities;
import com.naomale.common.AppException;
import com.naomale.common.Jsons;
import com.naomale.common.Utils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiService {
    private final DeepSeekClient client;
    private final SettingsService settingsService;
    private final DataNormalizer normalizer;
    private final ViewService view;

    public AiService(DeepSeekClient client, SettingsService settingsService,
                     DataNormalizer normalizer, ViewService view) {
        this.client = client;
        this.settingsService = settingsService;
        this.normalizer = normalizer;
        this.view = view;
    }

    public Map<String, Object> test(String familyId) {
        return client.test(settingsService.raw(familyId));
    }

    public Map<String, Object> parseRecipe(String familyId, String text, String imageDataUrl) {
        String input = text == null ? "" : text.trim();
        boolean hasImage = imageDataUrl != null && !imageDataUrl.isBlank();
        if (input.isEmpty() && !hasImage) throw AppException.badRequest("请先输入菜谱文字，或上传一张菜谱图片");
        if (input.length() > 4000) throw AppException.badRequest("菜谱文字过长，请精简到 4000 字以内");
        if (hasImage) {
            if (!imageDataUrl.startsWith("data:image/")) {
                throw AppException.badRequest("图片格式不正确，请上传 JPG / PNG / WebP 图片");
            }
            if (imageDataUrl.length() > 12_000_000) {
                throw new AppException(413, "图片过大，请压缩到 8MB 以内");
            }
        }

        String prompt = """
                请分析下面的家庭菜谱、食材描述，或用户上传的菜谱图片，结构化提取并补全菜品信息与营养估算。
                如果提供了图片，请直接识别图片中的菜名、食材、用量和做法；图片可能是手写菜谱、印刷菜谱或食材照片。
                如果文字和图片同时存在，请以两者结合为准。

                用户文字输入：
                \"\"\"
                %s
                \"\"\"

                必须返回严格合法的 JSON 对象，字段如下：
                {
                  "name": "菜品名称",
                  "category": "meat|seafood|veggie|soup|staple|light|fruit 之一",
                  "cuisine": "菜系或风味",
                  "prepTime": 准备耗时（分钟，数字）,
                  "cookTime": 烹饪耗时（分钟，数字）,
                  "difficulty": "easy|medium|hard 之一",
                  "estimatedPrice": 食材采购成本（元，数字）,
                  "servings": 建议就餐人数（数字）,
                  "description": "50 字以内描述",
                  "ingredients": [{"name": "食材名", "amount": "份量", "category": "main|seasoning|garnish"}],
                  "steps": [{"order": 1, "title": "小标题", "instruction": "做法", "tip": "可选", "durationMins": 5}],
                  "tags": ["标签"],
                  "nutrition": {"calories": 千卡, "protein": 克, "carbs": 克, "fat": 克, "fiber": 克, "sodium": 毫克, "sugar": 克, "vitaminA": 微克RAE, "vitaminB1": 毫克, "vitaminB2": 毫克, "vitaminB6": 毫克, "vitaminC": 毫克, "vitaminE": 毫克, "folate": 微克DFE, "potassium": 毫克, "magnesium": 毫克, "calcium": 毫克}
                }
                只输出 JSON，不要 Markdown 代码块或解释。
                """.formatted(input.isBlank() ? "（无文字，请直接识别图片）" : input);

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content",
                "你是一位精通中西家庭料理与营养学的五星级名厨，擅长识别菜谱图片。只输出严格合法的 JSON。"));
        if (hasImage) {
            List<Map<String, Object>> parts = new ArrayList<>();
            parts.add(Map.of("type", "text", "text", prompt));
            parts.add(Map.of("type", "image_url",
                    "image_url", Map.of("url", imageDataUrl, "detail", "high")));
            messages.add(Map.of("role", "user", "content", parts));
        } else {
            messages.add(Map.of("role", "user", "content", prompt));
        }

        String content = client.chat(settingsService.raw(familyId), messages, true, 0.3, 3000);
        Map<String, Object> parsed = extractJson(content);
        if (Jsons.str(parsed.get("name"), "").isBlank()) {
            throw new AppException(502, "AI 没有返回有效的菜名，请重试");
        }
        Entities.Dish draft = normalizer.dish(parsed, "draft", null);
        return view.dish(draft);
    }

    public Map<String, Object> nutrition(String familyId, String name, List<Object> rawIngredients, int servings) {
        String dishName = name == null || name.isBlank() ? "这道菜" : name.trim();
        List<Map<String, Object>> ingredients = new ArrayList<>();
        for (Object raw : rawIngredients == null ? List.of() : rawIngredients) {
            Map<String, Object> item = Jsons.map(raw);
            String itemName = Jsons.str(item.get("name"), "");
            if (itemName.isBlank()) continue;
            Map<String, Object> value = new LinkedHashMap<>();
            value.put("name", itemName);
            value.put("amount", Jsons.str(item.get("amount"), "适量"));
            ingredients.add(value);
            if (ingredients.size() >= 30) break;
        }
        if (ingredients.isEmpty()) throw AppException.badRequest("请先填写食材，再让 AI 估算营养");

        StringBuilder lines = new StringBuilder();
        for (Map<String, Object> item : ingredients) {
            lines.append("- ").append(item.get("name")).append("：").append(item.get("amount")).append('\n');
        }

        String prompt = """
                请根据下面的菜品和食材用量，估算“整盘菜”的营养成分（不是每 100g，也不是单份）。
                菜品：%s
                就餐人数：%d 人
                食材用量：
                %s

                请返回严格合法的 JSON 对象：
                {
                  "calories": 整盘热量（千卡，数字）,
                  "protein": 整盘蛋白质（克，数字）,
                  "carbs": 整盘碳水化合物（克，数字）,
                  "fat": 整盘脂肪（克，数字）,
                  "fiber": 整盘膳食纤维（克，数字）,
                  "sodium": 整盘钠（毫克，数字）,
                  "sugar": 整盘糖（克，数字）,
                  "vitaminA": 整盘维生素A（微克RAE，数字）,
                  "vitaminB1": 整盘维生素B1（毫克，数字）,
                  "vitaminB2": 整盘维生素B2（毫克，数字）,
                  "vitaminB6": 整盘维生素B6（毫克，数字）,
                  "vitaminC": 整盘维生素C（毫克，数字）,
                  "vitaminE": 整盘维生素E（毫克，数字）,
                  "folate": 整盘叶酸（微克DFE，数字）,
                  "potassium": 整盘钾（毫克，数字）,
                  "magnesium": 整盘镁（毫克，数字）,
                  "calcium": 整盘钙（毫克，数字）
                }
                只输出 JSON，不要 Markdown 代码块或解释。
                """.formatted(dishName, Math.max(1, servings), lines);

        String content = client.chat(settingsService.raw(familyId),
                List.of(Map.of("role", "user", "content", prompt)), true, 0.2, 600);
        Map<String, Object> parsed = extractJson(content);
        Map<String, Object> raw = Jsons.map(parsed.get("nutrition"));
        if (raw.isEmpty()) raw = parsed;
        if (!(raw.get("calories") instanceof Number) || !(raw.get("protein") instanceof Number)) {
            throw new AppException(502, "AI 没有返回有效的营养数据，请重试");
        }

        Map<String, Object> nutrition = new LinkedHashMap<>();
        nutrition.put("calories", Math.round(DataNormalizer.clampDouble(Jsons.dbl(raw.get("calories"), 0), 0, 3000)));
        nutrition.put("protein", Utils.round1(DataNormalizer.clampDouble(Jsons.dbl(raw.get("protein"), 0), 0, 300)));
        nutrition.put("carbs", Utils.round1(DataNormalizer.clampDouble(Jsons.dbl(raw.get("carbs"), 0), 0, 500)));
        nutrition.put("fat", Utils.round1(DataNormalizer.clampDouble(Jsons.dbl(raw.get("fat"), 0), 0, 300)));
        nutrition.put("fiber", Utils.round1(DataNormalizer.clampDouble(Jsons.dbl(raw.get("fiber"), 0), 0, 100)));
        nutrition.put("sodium", Math.round(DataNormalizer.clampDouble(Jsons.dbl(raw.get("sodium"), 0), 0, 10000)));
        nutrition.put("sugar", Utils.round1(DataNormalizer.clampDouble(Jsons.dbl(raw.get("sugar"), 0), 0, 500)));
        nutrition.put("vitaminA", Math.round(DataNormalizer.clampDouble(Jsons.dbl(raw.get("vitaminA"), 0), 0, 5000)));
        nutrition.put("vitaminB1", Utils.round1(DataNormalizer.clampDouble(Jsons.dbl(raw.get("vitaminB1"), 0), 0, 50)));
        nutrition.put("vitaminB2", Utils.round1(DataNormalizer.clampDouble(Jsons.dbl(raw.get("vitaminB2"), 0), 0, 50)));
        nutrition.put("vitaminB6", Utils.round1(DataNormalizer.clampDouble(Jsons.dbl(raw.get("vitaminB6"), 0), 0, 50)));
        nutrition.put("vitaminC", Utils.round1(DataNormalizer.clampDouble(Jsons.dbl(raw.get("vitaminC"), 0), 0, 2000)));
        nutrition.put("vitaminE", Utils.round1(DataNormalizer.clampDouble(Jsons.dbl(raw.get("vitaminE"), 0), 0, 200)));
        nutrition.put("folate", Math.round(DataNormalizer.clampDouble(Jsons.dbl(raw.get("folate"), 0), 0, 2000)));
        nutrition.put("potassium", Math.round(DataNormalizer.clampDouble(Jsons.dbl(raw.get("potassium"), 0), 0, 10000)));
        nutrition.put("magnesium", Math.round(DataNormalizer.clampDouble(Jsons.dbl(raw.get("magnesium"), 0), 0, 2000)));
        nutrition.put("calcium", Math.round(DataNormalizer.clampDouble(Jsons.dbl(raw.get("calcium"), 0), 0, 5000)));
        return nutrition;
    }

    public String advice(String familyId, List<String> dishNames, int dinerCount, Map<String, Object> totals) {
        int diners = Math.max(1, dinerCount);
        Map<String, Object> safeTotals = totals == null ? Map.of() : totals;
        int perCal = (int) Math.round(Jsons.dbl(safeTotals.get("calories"), 0) / diners);
        double perProtein = Utils.round1(Jsons.dbl(safeTotals.get("protein"), 0) / diners);

        String prompt = """
                请作为专业家庭临床营养师，针对以下家庭餐桌点单给出可直接执行的膳食点评（220 字以内）。
                就餐人数：%d 人
                菜品清单：%s
                整餐总热量：%s kcal（人均 %d kcal）
                总蛋白质：%s g（人均 %s g）
                总碳水：%s g，总脂肪：%s g，膳食纤维：%s g，钠：%s mg
                糖：%s g，维生素C：%s mg，叶酸：%s μg，钾：%s mg，钙：%s mg，镁：%s mg

                请严格按下面四行输出，不要使用 Markdown 标题或代码块：
                本餐结构：用一句话评价荤素、主食和蛋白质结构。
                可能缺少：结合数据指出可能不足的营养素；没有明显短板就写“没有明显短板”。
                建议补充：给出 2-3 个具体食材或菜品，说明补什么。
                优先调整：给一条最优先执行的建议（如加一道菜、减盐、换主食）。
                """.formatted(
                diners,
                dishNames == null || dishNames.isEmpty() ? "（未填写）" : String.join("、", dishNames),
                Jsons.str(safeTotals.get("calories"), "0"), perCal,
                Jsons.str(safeTotals.get("protein"), "0"), perProtein,
                Jsons.str(safeTotals.get("carbs"), "0"),
                Jsons.str(safeTotals.get("fat"), "0"),
                Jsons.str(safeTotals.get("fiber"), "0"),
                Jsons.str(safeTotals.get("sodium"), "0"),
                Jsons.str(safeTotals.get("sugar"), "0"),
                Jsons.str(safeTotals.get("vitaminC"), "0"),
                Jsons.str(safeTotals.get("folate"), "0"),
                Jsons.str(safeTotals.get("potassium"), "0"),
                Jsons.str(safeTotals.get("calcium"), "0"),
                Jsons.str(safeTotals.get("magnesium"), "0"));

        return client.chat(settingsService.raw(familyId),
                List.of(Map.of("role", "user", "content", prompt)), false, 0.7, 800).trim();
    }

    private Map<String, Object> extractJson(String text) {
        String cleaned = text.replaceAll("(?i)```json", "").replace("```", "").trim();
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        if (start < 0 || end <= start) throw new AppException(502, "AI 返回内容中找不到 JSON 对象");
        try {
            return Jsons.MAPPER.readValue(cleaned.substring(start, end + 1), new TypeReference<>() {
            });
        } catch (Exception error) {
            throw new AppException(502, "AI 返回的 JSON 格式不合法，请重试");
        }
    }
}
