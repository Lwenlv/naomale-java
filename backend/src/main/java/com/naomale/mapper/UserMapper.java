package com.naomale.mapper;

import com.naomale.Entities;
import org.apache.ibatis.annotations.*;

@Mapper
public interface UserMapper {
    @Select("select * from users where lower(username) = lower(#{username}) limit 1")
    Entities.User findByUsername(@Param("username") String username);

    @Select("select * from users where id = #{id}")
    Entities.User findById(@Param("id") String id);

    @Insert("insert into users (id, username, display_name, password_hash, created_at) " +
            "values (#{id}, #{username}, #{displayName}, #{passwordHash}, #{createdAt})")
    void insert(Entities.User user);

    @Select("select count(*) from users")
    long count();
}
