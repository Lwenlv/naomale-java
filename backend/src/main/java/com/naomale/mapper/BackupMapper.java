package com.naomale.mapper;

import com.naomale.Entities;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface BackupMapper {
    @Insert("insert into backups (id, family_id, reason, payload, created_at) " +
            "values (#{id}, #{familyId}, #{reason}, #{payload}, #{createdAt})")
    void insert(Entities.Backup backup);

    @Select("select id, family_id, reason, created_at, length(payload) as size from backups " +
            "where family_id = #{familyId} order by created_at desc, id desc")
    List<Entities.Backup> listByFamily(@Param("familyId") String familyId);

    @Select("select * from backups where family_id = #{familyId} and id = #{id}")
    Entities.Backup find(@Param("familyId") String familyId, @Param("id") String id);

    @Select("select count(*) from backups where family_id = #{familyId}")
    int count(@Param("familyId") String familyId);

    @Delete("delete from backups where family_id = #{familyId} and id not in (" +
            "select id from (select id from backups where family_id = #{familyId} " +
            "order by created_at desc, id desc limit #{keep}) keep_rows)")
    void deleteOld(@Param("familyId") String familyId, @Param("keep") int keep);

    @Delete("delete from backups where family_id = #{familyId}")
    void deleteByFamily(@Param("familyId") String familyId);
}
