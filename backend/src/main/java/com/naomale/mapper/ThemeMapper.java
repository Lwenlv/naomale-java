package com.naomale.mapper;

import com.naomale.Entities;
import org.apache.ibatis.annotations.*;

@Mapper
public interface ThemeMapper {
    @Select("select * from user_themes where user_id = #{userId}")
    Entities.Theme findByUserId(@Param("userId") String userId);

    @Insert("insert into user_themes (user_id, active_theme, name, config, updated_at) " +
            "values (#{userId}, #{activeTheme}, #{name}, #{config}, #{updatedAt}) " +
            "on duplicate key update active_theme = values(active_theme), name = values(name), " +
            "config = values(config), updated_at = values(updated_at)")
    void upsert(Entities.Theme theme);

    @Delete("delete from user_themes where user_id = #{userId}")
    void deleteByUserId(@Param("userId") String userId);
}
