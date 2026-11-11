package com.naomale.mapper;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AuditMapper {
    @Insert("insert into audit_logs (family_id, action, detail, created_at) " +
            "values (#{familyId}, #{action}, #{detail}, #{createdAt})")
    void insert(@Param("familyId") String familyId, @Param("action") String action,
                @Param("detail") String detail, @Param("createdAt") String createdAt);
}
