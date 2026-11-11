package com.naomale.mapper;

import com.naomale.Entities;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface OrderItemMapper {
    @Select("select * from order_items where order_id = #{orderId} order by sort_order asc")
    List<Entities.OrderItem> listByOrder(@Param("orderId") String orderId);

    @Insert("insert into order_items (id, order_id, dish_id, dish_snapshot, quantity, member, notes, " +
            "custom_price, sort_order) values (#{id}, #{orderId}, #{dishId}, #{dishSnapshot}, #{quantity}, " +
            "#{member}, #{notes}, #{customPrice}, #{sortOrder})")
    void insert(Entities.OrderItem item);

    @Delete("delete from order_items where order_id = #{orderId}")
    void deleteByOrder(@Param("orderId") String orderId);

    @Delete("delete from order_items where order_id in (select id from orders where family_id = #{familyId})")
    void deleteByFamily(@Param("familyId") String familyId);
}
