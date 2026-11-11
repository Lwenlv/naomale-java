package com.naomale.mapper;

import com.naomale.Entities;
import org.apache.ibatis.annotations.*;

@Mapper
public interface SettingsMapper {
    @Select("select * from family_settings where family_id = #{familyId}")
    Entities.Settings findByFamilyId(@Param("familyId") String familyId);

    @Insert("insert into family_settings (family_id, ai_provider, ai_model, deepseek_api_key, theme) " +
            "values (#{familyId}, #{aiProvider}, #{aiModel}, #{deepseekApiKey}, #{theme}) " +
            "on duplicate key update family_id = family_id")
    void ensureDefaults(Entities.Settings settings);

    @Update("update family_settings set ai_provider = #{aiProvider}, ai_model = #{aiModel}, " +
            "deepseek_api_key = #{deepseekApiKey}, theme = #{theme} where family_id = #{familyId}")
    void update(Entities.Settings settings);
}
