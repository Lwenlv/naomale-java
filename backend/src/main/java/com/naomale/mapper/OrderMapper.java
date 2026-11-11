package com.naomale.mapper;

import com.naomale.Entities;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface OrderMapper {
    String COLUMNS = "id, family_id, title, meal_type, meal_date, diner_count, chef, total_estimated_cost, " +
            "actual_cost, status, notes, is_current as current_order, created_at";

    @Select("select " + COLUMNS + " from orders where family_id = #{familyId} and is_current = 1 limit 1")
    Entities.Order findCurrent(@Param("familyId") String familyId);

    @Select("select " + COLUMNS + " from orders where family_id = #{familyId} and is_current = 0 " +
            "order by meal_date desc, created_at desc")
    List<Entities.Order> listHistory(@Param("familyId") String familyId);

    @Select("select " + COLUMNS + " from orders where family_id = #{familyId} and id = #{id}")
    Entities.Order find(@Param("familyId") String familyId, @Param("id") String id);

    @Select("select count(*) from orders where family_id = #{familyId} and is_current = 0")
    int countHistory(@Param("familyId") String familyId);

    @Insert("insert into orders (id, family_id, title, meal_type, meal_date, diner_count, chef, " +
            "total_estimated_cost, actual_cost, status, notes, is_current, created_at) values (" +
            "#{id}, #{familyId}, #{title}, #{mealType}, #{mealDate}, #{dinerCount}, #{chef}, " +
            "#{totalEstimatedCost}, #{actualCost}, #{status}, #{notes}, #{currentOrder}, #{createdAt})")
    void insert(Entities.Order order);

    @Update("update orders set title = #{title}, meal_type = #{mealType}, meal_date = #{mealDate}, " +
            "diner_count = #{dinerCount}, chef = #{chef}, total_estimated_cost = #{totalEstimatedCost}, " +
            "actual_cost = #{actualCost}, status = #{status}, notes = #{notes}, is_current = #{currentOrder} " +
            "where family_id = #{familyId} and id = #{id}")
    void update(Entities.Order order);

    @Update("update orders set is_current = 0 where family_id = #{familyId} and is_current = 1")
    void demoteCurrent(@Param("familyId") String familyId);

    @Delete("delete from orders where family_id = #{familyId} and id = #{id}")
    void delete(@Param("familyId") String familyId, @Param("id") String id);

    @Delete("delete from orders where family_id = #{familyId}")
    void deleteByFamily(@Param("familyId") String familyId);
}
