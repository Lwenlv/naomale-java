package com.naomale.mapper;

import com.naomale.Entities;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface DishMapper {
    String COLUMNS = "id, family_id, name, pinyin, category, cuisine, prep_time, cook_time, difficulty, " +
            "estimated_price, servings, cover_image, description, ingredients, steps, nutrition, tags, " +
            "is_favorite as favorite, cook_count, last_cooked_date, created_at";

    @Select("select " + COLUMNS + " from dishes where family_id = #{familyId} order by created_at desc")
    List<Entities.Dish> listByFamily(@Param("familyId") String familyId);

    @Select("select " + COLUMNS + " from dishes where family_id = #{familyId} and id = #{id}")
    Entities.Dish find(@Param("familyId") String familyId, @Param("id") String id);

    @Select("select count(*) from dishes where family_id = #{familyId}")
    int count(@Param("familyId") String familyId);

    @Insert("insert into dishes (id, family_id, name, pinyin, category, cuisine, prep_time, cook_time, " +
            "difficulty, estimated_price, servings, cover_image, description, ingredients, steps, nutrition, " +
            "tags, is_favorite, cook_count, last_cooked_date, created_at) values (" +
            "#{id}, #{familyId}, #{name}, #{pinyin}, #{category}, #{cuisine}, #{prepTime}, #{cookTime}, " +
            "#{difficulty}, #{estimatedPrice}, #{servings}, #{coverImage}, #{description}, #{ingredients}, " +
            "#{steps}, #{nutrition}, #{tags}, #{favorite}, #{cookCount}, #{lastCookedDate}, #{createdAt})")
    void insert(Entities.Dish dish);

    @Update("update dishes set name = #{name}, pinyin = #{pinyin}, category = #{category}, cuisine = #{cuisine}, " +
            "prep_time = #{prepTime}, cook_time = #{cookTime}, difficulty = #{difficulty}, " +
            "estimated_price = #{estimatedPrice}, servings = #{servings}, cover_image = #{coverImage}, " +
            "description = #{description}, ingredients = #{ingredients}, steps = #{steps}, nutrition = #{nutrition}, " +
            "tags = #{tags}, is_favorite = #{favorite}, cook_count = #{cookCount}, " +
            "last_cooked_date = #{lastCookedDate} where family_id = #{familyId} and id = #{id}")
    void update(Entities.Dish dish);

    @Update("update dishes set is_favorite = #{favorite} where family_id = #{familyId} and id = #{id}")
    void updateFavorite(@Param("familyId") String familyId, @Param("id") String id, @Param("favorite") int favorite);

    @Delete("delete from dishes where family_id = #{familyId} and id = #{id}")
    void delete(@Param("familyId") String familyId, @Param("id") String id);

    @Delete("delete from dishes where family_id = #{familyId}")
    void deleteByFamily(@Param("familyId") String familyId);

    @Update("update dishes set cook_count = cook_count + #{quantity}, last_cooked_date = #{date} " +
            "where family_id = #{familyId} and id = #{id}")
    void addCookCount(@Param("familyId") String familyId, @Param("id") String id,
                      @Param("quantity") int quantity, @Param("date") String date);
}
