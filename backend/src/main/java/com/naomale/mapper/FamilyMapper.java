package com.naomale.mapper;

import com.naomale.Entities;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface FamilyMapper {
    @Insert("insert into families (id, name, owner_id, invite_code, created_at) " +
            "values (#{id}, #{name}, #{ownerId}, #{inviteCode}, #{createdAt})")
    void insert(Entities.Family family);

    @Select("select * from families where id = #{id}")
    Entities.Family findById(@Param("id") String id);

    @Select("select * from families where invite_code = #{inviteCode} limit 1")
    Entities.Family findByInviteCode(@Param("inviteCode") String inviteCode);

    @Select("select f.* from families f join family_members m on m.family_id = f.id " +
            "where m.user_id = #{userId} order by f.created_at asc")
    List<Entities.Family> listByUser(@Param("userId") String userId);

    @Select("select count(*) from family_members where family_id = #{familyId}")
    int countMembers(@Param("familyId") String familyId);

    @Insert("insert into family_members (family_id, user_id, role, joined_at) " +
            "values (#{familyId}, #{userId}, #{role}, #{joinedAt})")
    void addMember(@Param("familyId") String familyId, @Param("userId") String userId,
                   @Param("role") String role, @Param("joinedAt") String joinedAt);

    @Select("select count(*) from family_members where family_id = #{familyId} and user_id = #{userId}")
    int isMember(@Param("familyId") String familyId, @Param("userId") String userId);

    @Select("select u.id as user_id, u.username, u.display_name, m.role, m.joined_at " +
            "from family_members m join users u on u.id = m.user_id " +
            "where m.family_id = #{familyId} " +
            "order by (m.role = 'owner') desc, m.joined_at asc")
    List<Entities.FamilyMemberRow> listMembers(@Param("familyId") String familyId);
}
