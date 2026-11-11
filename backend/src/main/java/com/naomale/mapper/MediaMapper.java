package com.naomale.mapper;

import com.naomale.Entities;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface MediaMapper {
    @Insert("insert into media (id, family_id, mime, file_name, data, bytes, created_at) " +
            "values (#{id}, #{familyId}, #{mime}, #{fileName}, #{data}, #{bytes}, #{createdAt})")
    void insert(Entities.Media media);

    @Select("select id, family_id, mime, file_name, data, bytes, created_at from media " +
            "where family_id = #{familyId} and id = #{id}")
    Entities.Media find(@Param("familyId") String familyId, @Param("id") String id);

    @Select("select count(*) from media where family_id = #{familyId}")
    int count(@Param("familyId") String familyId);

    @Delete("delete from media where family_id = #{familyId}")
    void deleteByFamily(@Param("familyId") String familyId);
}
