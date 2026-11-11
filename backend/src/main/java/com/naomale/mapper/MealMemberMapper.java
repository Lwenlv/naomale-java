package com.naomale.mapper;

import com.naomale.Entities;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface MealMemberMapper {
    @Select("select * from meal_members where family_id = #{familyId} order by sort_order asc, name asc")
    List<Entities.MealMember> listByFamily(@Param("familyId") String familyId);

    @Insert("insert into meal_members (id, family_id, name, role, avatar_bg, dietary_preference, sort_order) " +
            "values (#{id}, #{familyId}, #{name}, #{role}, #{avatarBg}, #{dietaryPreference}, #{sortOrder})")
    void insert(Entities.MealMember member);

    @Delete("delete from meal_members where family_id = #{familyId} and id = #{id}")
    void delete(@Param("familyId") String familyId, @Param("id") String id);

    @Delete("delete from meal_members where family_id = #{familyId}")
    void deleteByFamily(@Param("familyId") String familyId);

    @Select("select count(*) from meal_members where family_id = #{familyId}")
    int count(@Param("familyId") String familyId);
}
