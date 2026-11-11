package com.naomale.service;

import com.naomale.Entities;
import com.naomale.common.Jsons;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 把数据库实体转换成前端现有的 JSON 结构（与旧版 TypeScript 类型保持一致）。 */
@Service
public class ViewService {

    public Map<String, Object> user(Entities.User user) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("displayName", user.getDisplayName());
        map.put("createdAt", user.getCreatedAt());
        return map;
    }

    public Map<String, Object> family(Entities.Family family, String role, int memberCount) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", family.getId());
        map.put("name", family.getName());
        map.put("ownerId", family.getOwnerId());
        map.put("role", role);
        map.put("memberCount", memberCount);
        map.put("inviteCode", family.getInviteCode());
        map.put("createdAt", family.getCreatedAt());
        return map;
    }

    public List<Map<String, Object>> members(List<Entities.MealMember> members) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (Entities.MealMember member : members) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", member.getId());
            map.put("name", member.getName());
            map.put("role", member.getRole());
            map.put("avatarBg", member.getAvatarBg());
            map.put("dietaryPreference", member.getDietaryPreference() == null ? "" : member.getDietaryPreference());
            list.add(map);
        }
        return list;
    }

    /** 用家庭账号成员作为点菜/分餐成员，避免再维护一套独立成员表。 */
    public List<Map<String, Object>> accountMembers(List<Entities.FamilyMemberRow> members) {
        String[] colors = {"bg-amber-600", "bg-rose-500", "bg-sky-500", "bg-emerald-600", "bg-purple-600", "bg-orange-500"};
        List<Map<String, Object>> list = new ArrayList<>();
        int index = 0;
        for (Entities.FamilyMemberRow member : members) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", member.getUserId());
            map.put("name", member.getDisplayName());
            map.put("role", "owner".equals(member.getRole()) ? "主账号" : "家庭成员");
            map.put("avatarBg", colors[index % colors.length]);
            map.put("dietaryPreference", "");
            list.add(map);
            index++;
        }
        return list;
    }

    public Map<String, Object> dish(Entities.Dish dish) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", dish.getId());
        map.put("name", dish.getName());
        if (dish.getPinyin() != null && !dish.getPinyin().isBlank()) map.put("pinyin", dish.getPinyin());
        map.put("category", dish.getCategory());
        map.put("cuisine", dish.getCuisine());
        map.put("prepTime", nz(dish.getPrepTime()));
        map.put("cookTime", nz(dish.getCookTime()));
        map.put("difficulty", dish.getDifficulty());
        map.put("estimatedPrice", money(dish.getEstimatedPrice()));
        map.put("servings", nz(dish.getServings()));
        map.put("coverImage", dish.getCoverImage());
        map.put("description", dish.getDescription() == null ? "" : dish.getDescription());
        map.put("ingredients", jsonList(dish.getIngredients()));
        map.put("steps", jsonList(dish.getSteps()));
        map.put("nutrition", jsonMapOrZero(dish.getNutrition()));
        map.put("tags", jsonList(dish.getTags()));
        map.put("isFavorite", dish.getFavorite() != null && dish.getFavorite() == 1);
        map.put("cookCount", nz(dish.getCookCount()));
        if (dish.getLastCookedDate() != null) map.put("lastCookedDate", dish.getLastCookedDate());
        map.put("createdAt", dish.getCreatedAt());
        return map;
    }

    public List<Map<String, Object>> dishes(List<Entities.Dish> dishes) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Entities.Dish dish : dishes) result.add(dish(dish));
        return result;
    }

    public Map<String, Object> order(Entities.Order order, List<Entities.OrderItem> items,
                                    Map<String, Map<String, Object>> dishesById) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", order.getId());
        map.put("title", order.getTitle());
        map.put("mealType", order.getMealType());
        map.put("date", order.getMealDate());
        map.put("dinerCount", nz(order.getDinerCount()));
        map.put("chef", order.getChef() == null ? "" : order.getChef());
        map.put("status", order.getStatus());
        map.put("notes", order.getNotes() == null ? "" : order.getNotes());
        map.put("createdAt", order.getCreatedAt());
        if (order.getActualCost() != null) map.put("actualCost", money(order.getActualCost()));

        List<Map<String, Object>> itemViews = new ArrayList<>();
        double total = 0;
        for (Entities.OrderItem item : items) {
            Map<String, Object> dishView = dishesById.get(item.getDishId());
            if (dishView == null) {
                dishView = Jsons.map(item.getDishSnapshot());
                if (dishView.isEmpty()) {
                    dishView = new LinkedHashMap<>();
                    dishView.put("id", item.getDishId());
                    dishView.put("name", "（已删除菜品）");
                    dishView.put("category", "veggie");
                    dishView.put("cuisine", "已删除");
                    dishView.put("prepTime", 0);
                    dishView.put("cookTime", 0);
                    dishView.put("difficulty", "easy");
                    dishView.put("estimatedPrice", 0);
                    dishView.put("servings", 1);
                    dishView.put("coverImage", "/images/dish-placeholder.svg");
                    dishView.put("description", "");
                    dishView.put("ingredients", List.of());
                    dishView.put("steps", List.of());
                    dishView.put("nutrition", zeroNutrition());
                    dishView.put("tags", List.of());
                    dishView.put("isFavorite", false);
                    dishView.put("cookCount", 0);
                    dishView.put("createdAt", order.getCreatedAt());
                }
            }

            double price = item.getCustomPrice() == null ? 0 : item.getCustomPrice().doubleValue();
            int quantity = nz(item.getQuantity());
            total += price * quantity;

            Map<String, Object> itemView = new LinkedHashMap<>();
            itemView.put("id", item.getId());
            itemView.put("dishId", item.getDishId());
            itemView.put("dish", dishView);
            itemView.put("quantity", quantity);
            itemView.put("member", item.getMember());
            itemView.put("notes", item.getNotes() == null ? "" : item.getNotes());
            itemView.put("customPrice", price);
            itemViews.add(itemView);
        }

        map.put("items", itemViews);
        map.put("totalEstimatedCost", Math.round(total * 100.0) / 100.0);
        return map;
    }

    public Map<String, Object> publicSettings(Entities.Settings settings) {
        Map<String, Object> ai = new LinkedHashMap<>();
        ai.put("provider", settings.getAiProvider() == null ? "deepseek" : settings.getAiProvider());
        ai.put("model", settings.getAiModel() == null ? "deepseek-flash" : settings.getAiModel());
        boolean hasKey = settings.getDeepseekApiKey() != null && !settings.getDeepseekApiKey().isBlank();
        ai.put("hasKey", hasKey);
        ai.put("maskedKey", hasKey ? com.naomale.common.Utils.maskKey(settings.getDeepseekApiKey()) : "");

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("ai", ai);
        map.put("theme", settings.getTheme() == null ? "naomale|naomale" : settings.getTheme());
        return map;
    }

    public Map<String, Object> auth(Entities.User user, List<Map<String, Object>> families, String activeFamilyId) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("user", user(user));
        map.put("families", families);
        map.put("activeFamilyId", activeFamilyId);
        return map;
    }

    public Map<String, Object> meta(Entities.Family family, int dishes, int members, int orders, int media,
                                    int backups, String now) {
        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("dishes", dishes);
        counts.put("members", members);
        counts.put("orders", orders);
        counts.put("media", media);

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("appName", "闹麻了点单");
        map.put("dataDir", "云端数据库");
        map.put("schemaVersion", 1);
        map.put("counts", counts);
        map.put("createdAt", family.getCreatedAt());
        map.put("updatedAt", now);
        map.put("lastSavedAt", now);
        map.put("backupCount", backups);
        map.put("auditLogPath", "系统日志");
        map.put("warnings", List.of());
        return map;
    }

    public Map<String, Object> zeroNutrition() {
        Map<String, Object> nutrition = new LinkedHashMap<>();
        nutrition.put("calories", 0);
        nutrition.put("protein", 0);
        nutrition.put("carbs", 0);
        nutrition.put("fat", 0);
        nutrition.put("fiber", 0);
        nutrition.put("sodium", 0);
        nutrition.put("sugar", 0);
        nutrition.put("vitaminA", 0);
        nutrition.put("vitaminB1", 0);
        nutrition.put("vitaminB2", 0);
        nutrition.put("vitaminB6", 0);
        nutrition.put("vitaminC", 0);
        nutrition.put("vitaminE", 0);
        nutrition.put("folate", 0);
        nutrition.put("potassium", 0);
        nutrition.put("magnesium", 0);
        nutrition.put("calcium", 0);
        return nutrition;
    }

    private Object jsonList(String json) {
        Object value = Jsons.parse(json);
        return value instanceof List ? value : List.of();
    }

    private Object jsonMapOrZero(String json) {
        Object value = Jsons.parse(json);
        if (value instanceof Map) return value;
        return zeroNutrition();
    }

    public int nz(Integer value) {
        return value == null ? 0 : value;
    }

    private double money(BigDecimal value) {
        return value == null ? 0 : value.doubleValue();
    }
}
