package com.naomale;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 数据库实体。字段与 MySQL 表一一对应；JSON 字段（食材/步骤/营养/快照）以字符串保存，
 * 由 Service 层用 Jackson 转成前端需要的对象。
 */
public final class Entities {
    private Entities() {
    }

    @Data
    public static class User {
        private String id;
        private String username;
        private String displayName;
        private String passwordHash;
        private String createdAt;
    }

    @Data
    public static class Family {
        private String id;
        private String name;
        private String ownerId;
        private String inviteCode;
        private String createdAt;
    }

    @Data
    public static class FamilyMemberRow {
        private String userId;
        private String username;
        private String displayName;
        private String role;
        private String joinedAt;
    }

    @Data
    public static class Session {
        private String tokenHash;
        private String userId;
        private String activeFamilyId;
        private String createdAt;
        private String expiresAt;
    }

    @Data
    public static class Settings {
        private String familyId;
        private String aiProvider;
        private String aiModel;
        private String deepseekApiKey;
        private String theme;
    }

    @Data
    public static class MealMember {
        private String id;
        private String familyId;
        private String name;
        private String role;
        private String avatarBg;
        private String dietaryPreference;
        private Integer sortOrder;
    }

    @Data
    public static class Dish {
        private String id;
        private String familyId;
        private String name;
        private String pinyin;
        private String category;
        private String cuisine;
        private Integer prepTime;
        private Integer cookTime;
        private String difficulty;
        private BigDecimal estimatedPrice;
        private Integer servings;
        private String coverImage;
        private String description;
        private String ingredients;
        private String steps;
        private String nutrition;
        private String tags;
        private Integer favorite;
        private Integer cookCount;
        private String lastCookedDate;
        private String createdAt;
    }

    @Data
    public static class Order {
        private String id;
        private String familyId;
        private String title;
        private String mealType;
        private String mealDate;
        private Integer dinerCount;
        private String chef;
        private BigDecimal totalEstimatedCost;
        private BigDecimal actualCost;
        private String status;
        private String notes;
        private Integer currentOrder;
        private String createdAt;
    }

    @Data
    public static class OrderItem {
        private String id;
        private String orderId;
        private String dishId;
        private String dishSnapshot;
        private Integer quantity;
        private String member;
        private String notes;
        private BigDecimal customPrice;
        private Integer sortOrder;
    }

    @Data
    public static class Media {
        private String id;
        private String familyId;
        private String mime;
        private String fileName;
        private byte[] data;
        private Integer bytes;
        private String createdAt;
    }

    @Data
    public static class Backup {
        private String id;
        private String familyId;
        private String reason;
        private String payload;
        private String createdAt;
        private Long size;
    }

    @Data
    public static class Theme {
        private String userId;
        private String activeTheme;
        private String name;
        private String config;
        private String updatedAt;
    }
}
