package com.naomale.mapper;

import com.naomale.Entities;
import org.apache.ibatis.annotations.*;

@Mapper
public interface SessionMapper {
    @Insert("insert into sessions (token_hash, user_id, active_family_id, created_at, expires_at) " +
            "values (#{tokenHash}, #{userId}, #{activeFamilyId}, #{createdAt}, #{expiresAt})")
    void insert(Entities.Session session);

    @Select("select * from sessions where token_hash = #{tokenHash} limit 1")
    Entities.Session findByTokenHash(@Param("tokenHash") String tokenHash);

    @Update("update sessions set active_family_id = #{familyId} where token_hash = #{tokenHash}")
    void updateActiveFamily(@Param("tokenHash") String tokenHash, @Param("familyId") String familyId);

    @Delete("delete from sessions where token_hash = #{tokenHash}")
    void deleteByTokenHash(@Param("tokenHash") String tokenHash);

    @Delete("delete from sessions where expires_at < #{now}")
    int deleteExpired(@Param("now") String now);
}
