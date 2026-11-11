package com.naomale.service;

import com.naomale.Entities;
import com.naomale.common.AppException;
import com.naomale.common.Jsons;
import com.naomale.common.Utils;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** 统一的数据校验与规范化，避免前端异常输入直接写库。 */
@Component
public class DataNormalizer {
    private static final Set<String> CATEGORIES = Set.of("meat", "seafood", "veggie", "soup", "staple", "light", "fruit");
    private static final Set<String> DIFFICULTIES = Set.of("easy", "medium", "hard");
    private static final Set<String> MEAL_TYPES = Set.of("breakfast", "lunch", "dinner", "supper");
    private static final Set<String> STATUSES = Set.of("planned", "cooking", "served", "completed");
    private static final String DEFAULT_COVER = "/images/dish-placeholder.svg";
    private static final String[] AVATAR_COLORS = {
            "bg-amber-600", "bg-rose-500", "bg-sky-500", "bg-emerald-600", "bg-purple-600", "bg-orange-500"
    };

    public Entities.Dish dish(Map<String, Object> input, String familyId, Entities.Dish existing) {
        Entities.Dish dish = existing == null ? new Entities.Dish() : existing;
        boolean isNew = existing == null;

        String name = Jsons.str(input.get("name"), "");
        if (name.isBlank()) throw AppException.badRequest("菜品名称不能为空");
        dish.setName(cut(name, 80));
        dish.setFamilyId(familyId);
        if (isNew) {
            dish.setId(Jsons.str(input.get("id"), Utils.uuid()));
            dish.setCreatedAt(Jsons.str(input.get("createdAt"), Utils.now()));
            dish.setFavorite(0);
            dish.setCookCount(0);
        } else {
            String id = Jsons.str(input.get("id"), dish.getId());
            if (id != null && !id.isBlank()) dish.setId(id);
        }

        String pinyin = Jsons.str(input.get("pinyin"), "");
        dish.setPinyin(pinyin.isBlank() ? null : cut(pinyin, 80));

        String category = Jsons.str(input.get("category"), "veggie");
        dish.setCategory(CATEGORIES.contains(category) ? category : inferCategory(name));
        dish.setCuisine(cut(Jsons.str(input.get("cuisine"), "家常风味"), 60));
        dish.setPrepTime(clamp(Jsons.integer(input.get("prepTime"), 15), 0, 600));
        dish.setCookTime(clamp(Jsons.integer(input.get("cookTime"), 20), 0, 600));
        String difficulty = Jsons.str(input.get("difficulty"), "easy");
        dish.setDifficulty(DIFFICULTIES.contains(difficulty) ? difficulty : "easy");
        dish.setEstimatedPrice(Utils.money(clampDouble(Jsons.dbl(input.get("estimatedPrice"), 20), 0, 9999)));
        dish.setServings(clamp(Jsons.integer(input.get("servings"), 2), 1, 20));
        dish.setCoverImage(cut(Jsons.str(input.get("coverImage"), DEFAULT_COVER), 500));
        dish.setDescription(cut(Jsons.str(input.get("description"), name + "，家常烹饪，美味适口。"), 500));

        List<Object> ingredientList = Jsons.list(input.get("ingredients"));
        List<Map<String, Object>> ingredients = new ArrayList<>();
        for (Object item : ingredientList) {
            Map<String, Object> raw = Jsons.map(item);
            String itemName = Jsons.str(raw.get("name"), "");
            if (itemName.isBlank()) continue;
            Map<String, Object> value = new LinkedHashMap<>();
            value.put("name", cut(itemName, 40));
            value.put("amount", cut(Jsons.str(raw.get("amount"), "适量"), 40));
            String role = Jsons.str(raw.get("category"), "main");
            value.put("category", "seasoning".equals(role) || "garnish".equals(role) ? role : "main");
            ingredients.add(value);
            if (ingredients.size() >= 40) break;
        }
        if (ingredients.isEmpty()) {
            Map<String, Object> value = new LinkedHashMap<>();
            value.put("name", name);
            value.put("amount", "适量");
            value.put("category", "main");
            ingredients.add(value);
        }
        dish.setIngredients(Jsons.write(ingredients));

        List<Object> stepList = Jsons.list(input.get("steps"));
        List<Map<String, Object>> steps = new ArrayList<>();
        for (Object item : stepList) {
            Map<String, Object> raw = Jsons.map(item);
            String instruction = Jsons.str(raw.get("instruction"), "");
            if (instruction.isBlank()) continue;
            Map<String, Object> value = new LinkedHashMap<>();
            value.put("order", steps.size() + 1);
            value.put("title", cut(Jsons.str(raw.get("title"), "步骤 " + (steps.size() + 1)), 40));
            value.put("instruction", cut(instruction, 600));
            String tip = Jsons.str(raw.get("tip"), "");
            if (!tip.isBlank()) value.put("tip", cut(tip, 300));
            if (raw.get("durationMins") != null) {
                value.put("durationMins", clamp(Jsons.integer(raw.get("durationMins"), 0), 0, 1440));
            }
            steps.add(value);
            if (steps.size() >= 30) break;
        }
        if (steps.isEmpty()) {
            Map<String, Object> value = new LinkedHashMap<>();
            value.put("order", 1);
            value.put("title", "制作");
            value.put("instruction", "按家常做法烹制，调味后装盘即可。");
            steps.add(value);
        }
        dish.setSteps(Jsons.write(steps));

        Map<String, Object> rawNutrition = Jsons.map(input.get("nutrition"));
        Map<String, Object> nutrition = new LinkedHashMap<>();
        nutrition.put("calories", Math.round(clampDouble(Jsons.dbl(rawNutrition.get("calories"), 0), 0, 3000)));
        nutrition.put("protein", Utils.round1(clampDouble(Jsons.dbl(rawNutrition.get("protein"), 0), 0, 300)));
        nutrition.put("carbs", Utils.round1(clampDouble(Jsons.dbl(rawNutrition.get("carbs"), 0), 0, 500)));
        nutrition.put("fat", Utils.round1(clampDouble(Jsons.dbl(rawNutrition.get("fat"), 0), 0, 300)));
        nutrition.put("fiber", Utils.round1(clampDouble(Jsons.dbl(rawNutrition.get("fiber"), 0), 0, 100)));
        nutrition.put("sodium", Math.round(clampDouble(Jsons.dbl(rawNutrition.get("sodium"), 0), 0, 10000)));
        nutrition.put("sugar", Utils.round1(clampDouble(Jsons.dbl(rawNutrition.get("sugar"), 0), 0, 500)));
        nutrition.put("vitaminA", Math.round(clampDouble(Jsons.dbl(rawNutrition.get("vitaminA"), 0), 0, 5000)));
        nutrition.put("vitaminB1", Utils.round1(clampDouble(Jsons.dbl(rawNutrition.get("vitaminB1"), 0), 0, 50)));
        nutrition.put("vitaminB2", Utils.round1(clampDouble(Jsons.dbl(rawNutrition.get("vitaminB2"), 0), 0, 50)));
        nutrition.put("vitaminB6", Utils.round1(clampDouble(Jsons.dbl(rawNutrition.get("vitaminB6"), 0), 0, 50)));
        nutrition.put("vitaminC", Utils.round1(clampDouble(Jsons.dbl(rawNutrition.get("vitaminC"), 0), 0, 2000)));
        nutrition.put("vitaminE", Utils.round1(clampDouble(Jsons.dbl(rawNutrition.get("vitaminE"), 0), 0, 200)));
        nutrition.put("folate", Math.round(clampDouble(Jsons.dbl(rawNutrition.get("folate"), 0), 0, 2000)));
        nutrition.put("potassium", Math.round(clampDouble(Jsons.dbl(rawNutrition.get("potassium"), 0), 0, 10000)));
        nutrition.put("magnesium", Math.round(clampDouble(Jsons.dbl(rawNutrition.get("magnesium"), 0), 0, 2000)));
        nutrition.put("calcium", Math.round(clampDouble(Jsons.dbl(rawNutrition.get("calcium"), 0), 0, 5000)));
        dish.setNutrition(Jsons.write(nutrition));

        List<Object> tagList = Jsons.list(input.get("tags"));
        List<String> tags = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (Object item : tagList) {
            String tag = Jsons.str(item, "");
            if (tag.isBlank() || !seen.add(tag)) continue;
            tags.add(cut(tag, 20));
            if (tags.size() >= 12) break;
        }
        dish.setTags(Jsons.write(tags));

        if (input.get("isFavorite") != null) {
            dish.setFavorite(Jsons.bool(input.get("isFavorite"), false) ? 1 : 0);
        }
        if (input.get("cookCount") != null) {
            dish.setCookCount(clamp(Jsons.integer(input.get("cookCount"), 0), 0, 99999));
        }
        if (dish.getCookCount() == null) dish.setCookCount(0);
        if (dish.getFavorite() == null) dish.setFavorite(0);

        String lastCooked = Jsons.str(input.get("lastCookedDate"), "");
        dish.setLastCookedDate(lastCooked.matches("\\d{4}-\\d{2}-\\d{2}") ? lastCooked : null);
        if (dish.getCreatedAt() == null) dish.setCreatedAt(Utils.now());
        return dish;
    }

    public Entities.MealMember member(Map<String, Object> input, String familyId, int index) {
        String name = Jsons.str(input.get("name"), "");
        if (name.isBlank()) throw AppException.badRequest("成员姓名不能为空");
        Entities.MealMember member = new Entities.MealMember();
        member.setId(Jsons.str(input.get("id"), Utils.uuid()));
        member.setFamilyId(familyId);
        member.setName(cut(name, 20));
        member.setRole(cut(Jsons.str(input.get("role"), "家庭成员"), 20));
        member.setAvatarBg(cut(Jsons.str(input.get("avatarBg"), AVATAR_COLORS[index % AVATAR_COLORS.length]), 40));
        String preference = Jsons.str(input.get("dietaryPreference"), "");
        member.setDietaryPreference(preference.isBlank() ? null : cut(preference, 100));
        member.setSortOrder(index);
        return member;
    }

    public OrderBundle order(Map<String, Object> input, String familyId, Entities.Order existing,
                             Map<String, Map<String, Object>> dishesById, boolean current) {
        Entities.Order order = existing == null ? new Entities.Order() : existing;
        boolean isNew = existing == null;

        if (isNew) {
            order.setId(Jsons.str(input.get("id"), Utils.uuid()));
            order.setFamilyId(familyId);
            order.setCreatedAt(Jsons.str(input.get("createdAt"), Utils.now()));
        }

        String mealType = Jsons.str(input.get("mealType"), "dinner");
        order.setMealType(MEAL_TYPES.contains(mealType) ? mealType : "dinner");
        String date = Jsons.str(input.get("date"), Utils.today());
        order.setMealDate(date.matches("\\d{4}-\\d{2}-\\d{2}") ? date : Utils.today());
        order.setTitle(cut(Jsons.str(input.get("title"), "今日晚餐"), 80));
        order.setDinerCount(clamp(Jsons.integer(input.get("dinerCount"), 1), 1, 50));
        order.setChef(cut(Jsons.str(input.get("chef"), ""), 40));
        order.setNotes(cut(Jsons.str(input.get("notes"), ""), 500));
        String status = Jsons.str(input.get("status"), "planned");
        order.setStatus(STATUSES.contains(status) ? status : "planned");
        order.setCurrentOrder(current ? 1 : 0);

        if (input.containsKey("actualCost") && input.get("actualCost") != null) {
            double cost = Jsons.dbl(input.get("actualCost"), Double.NaN);
            order.setActualCost(Double.isNaN(cost) ? null : Utils.money(clampDouble(cost, 0, 999999)));
        } else if (!isNew) {
            order.setActualCost(existing.getActualCost());
        }

        List<Entities.OrderItem> items = new ArrayList<>();
        List<Object> itemList = Jsons.list(input.get("items"));
        double total = 0;
        int sort = 0;
        Set<String> usedIds = new LinkedHashSet<>();
        for (Object rawItem : itemList) {
            Map<String, Object> itemMap = Jsons.map(rawItem);
            String dishId = Jsons.str(itemMap.get("dishId"), "");
            Map<String, Object> dishView = Jsons.map(itemMap.get("dish"));
            if (dishView.isEmpty()) dishView = dishesById.get(dishId);
            if (dishView == null) dishView = new LinkedHashMap<>();
            if (dishId.isBlank()) dishId = Jsons.str(dishView.get("id"), "");

            Entities.OrderItem item = new Entities.OrderItem();
            String id = Jsons.str(itemMap.get("id"), Utils.uuid());
            while (!usedIds.add(id)) id = Utils.uuid();
            item.setId(id);
            item.setOrderId(order.getId());
            item.setDishId(dishId);
            item.setDishSnapshot(Jsons.write(dishView));
            item.setQuantity(clamp(Jsons.integer(itemMap.get("quantity"), 1), 1, 99));
            item.setMember(cut(Jsons.str(itemMap.get("member"), "全家"), 40));
            item.setNotes(cut(Jsons.str(itemMap.get("notes"), ""), 500));
            double fallbackPrice = Jsons.dbl(dishView.get("estimatedPrice"), 0);
            item.setCustomPrice(Utils.money(clampDouble(Jsons.dbl(itemMap.get("customPrice"), fallbackPrice), 0, 99999)));
            item.setSortOrder(sort++);
            items.add(item);
            total += item.getCustomPrice().doubleValue() * item.getQuantity();
            if (items.size() >= 60) break;
        }

        order.setTotalEstimatedCost(Utils.money(Math.round(total * 100.0) / 100.0));
        return new OrderBundle(order, items);
    }

    public record OrderBundle(Entities.Order order, List<Entities.OrderItem> items) {
    }

    public String inferCategory(String name) {
        if (name.matches(".*(鱼|虾|蟹|贝|海鲜|鲈).*")) return "seafood";
        if (name.matches(".*(汤|羹|煲|炖锅).*")) return "soup";
        if (name.matches(".*(面|饭|饺|包|馒头|粥|粉).*")) return "staple";
        if (name.matches(".*(沙拉|轻食|减脂|能量碗|藜麦).*")) return "light";
        if (name.matches(".*(苹果|香蕉|橙|梨|桃|葡萄|草莓|蓝莓|西瓜|猕猴桃|芒果|火龙果|菠萝|哈密瓜|车厘子|圣女果|柠檬|水果|果切|果盘).*")) return "fruit";
        if (name.matches(".*(肉|排骨|牛|鸡|鸭|羊|肘|翅).*")) return "meat";
        return "veggie";
    }

    public static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    public static double clampDouble(double value, double min, double max) {
        if (Double.isNaN(value) || Double.isInfinite(value)) return min;
        return Math.max(min, Math.min(max, value));
    }

    private String cut(String value, int max) {
        if (value == null) return "";
        String text = value.trim();
        return text.length() <= max ? text : text.substring(0, max);
    }
}
