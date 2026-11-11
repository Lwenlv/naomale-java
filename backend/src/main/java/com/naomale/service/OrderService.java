package com.naomale.service;

import com.naomale.Entities;
import com.naomale.common.AppException;
import com.naomale.common.Jsons;
import com.naomale.common.Utils;
import com.naomale.mapper.DishMapper;
import com.naomale.mapper.OrderItemMapper;
import com.naomale.mapper.OrderMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class OrderService {
    private final OrderMapper orderMapper;
    private final OrderItemMapper itemMapper;
    private final DishMapper dishMapper;
    private final DishService dishService;
    private final DataNormalizer normalizer;
    private final ViewService view;
    private final SseService sseService;

    public OrderService(OrderMapper orderMapper, OrderItemMapper itemMapper, DishMapper dishMapper,
                        DishService dishService, DataNormalizer normalizer, ViewService view,
                        SseService sseService) {
        this.orderMapper = orderMapper;
        this.itemMapper = itemMapper;
        this.dishMapper = dishMapper;
        this.dishService = dishService;
        this.normalizer = normalizer;
        this.view = view;
        this.sseService = sseService;
    }

    @Transactional
    public Entities.Order ensureCurrent(String familyId) {
        Entities.Order current = orderMapper.findCurrent(familyId);
        if (current != null) return current;

        current = new Entities.Order();
        current.setId(Utils.uuid());
        current.setFamilyId(familyId);
        current.setTitle("今日晚餐");
        current.setMealType("dinner");
        current.setMealDate(Utils.today());
        current.setDinerCount(1);
        current.setChef("");
        current.setTotalEstimatedCost(Utils.money(0));
        current.setActualCost(null);
        current.setStatus("planned");
        current.setNotes("");
        current.setCurrentOrder(1);
        current.setCreatedAt(Utils.now());
        orderMapper.insert(current);
        return current;
    }

    public List<Entities.OrderItem> items(String orderId) {
        return itemMapper.listByOrder(orderId);
    }

    public Map<String, Object> currentView(String familyId) {
        Entities.Order current = ensureCurrent(familyId);
        return view.order(current, items(current.getId()), dishService.viewMap(familyId));
    }

    public List<Map<String, Object>> historyViews(String familyId) {
        Map<String, Map<String, Object>> dishes = dishService.viewMap(familyId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Entities.Order order : orderMapper.listHistory(familyId)) {
            result.add(view.order(order, items(order.getId()), dishes));
        }
        return result;
    }

    @Transactional
    public Map<String, Object> updateCurrent(String familyId, Map<String, Object> body) {
        Entities.Order current = ensureCurrent(familyId);
        Map<String, Map<String, Object>> dishes = dishService.viewMap(familyId);
        DataNormalizer.OrderBundle bundle = normalizer.order(body, familyId, current, dishes, true);
        bundle.order().setId(current.getId());
        bundle.order().setFamilyId(familyId);
        orderMapper.update(bundle.order());
        itemMapper.deleteByOrder(current.getId());
        for (Entities.OrderItem item : bundle.items()) {
            item.setOrderId(current.getId());
            itemMapper.insert(item);
        }
        sseService.emit(familyId, "order.updated", bundle.items().size() + " 道菜");
        return view.order(bundle.order(), bundle.items(), dishes);
    }

    @Transactional
    public Map<String, Object> clearCurrent(String familyId) {
        Entities.Order current = ensureCurrent(familyId);
        itemMapper.deleteByOrder(current.getId());
        current.setTotalEstimatedCost(Utils.money(0));
        current.setActualCost(null);
        orderMapper.update(current);
        sseService.emit(familyId, "order.cleared", "清空点单");
        return view.order(current, List.of(), dishService.viewMap(familyId));
    }

    @Transactional
    public Map<String, Object> archive(String familyId, Double actualCost) {
        Entities.Order current = ensureCurrent(familyId);
        List<Entities.OrderItem> items = items(current.getId());
        if (items.isEmpty()) throw AppException.badRequest("当前点单为空，无法归档");

        Map<String, Integer> quantities = new LinkedHashMap<>();
        for (Entities.OrderItem item : items) {
            quantities.merge(item.getDishId(), item.getQuantity(), Integer::sum);
        }

        double cost = actualCost != null ? actualCost
                : (current.getActualCost() != null ? current.getActualCost().doubleValue()
                : current.getTotalEstimatedCost().doubleValue());
        current.setActualCost(Utils.money(cost));
        current.setStatus("completed");
        current.setCurrentOrder(0);
        orderMapper.update(current);

        for (Map.Entry<String, Integer> entry : quantities.entrySet()) {
            dishMapper.addCookCount(familyId, entry.getKey(), entry.getValue(), current.getMealDate());
        }

        Entities.Order next = new Entities.Order();
        next.setId(Utils.uuid());
        next.setFamilyId(familyId);
        next.setTitle("今日晚餐");
        next.setMealType(current.getMealType());
        next.setMealDate(Utils.today());
        next.setDinerCount(current.getDinerCount());
        next.setChef(current.getChef());
        next.setTotalEstimatedCost(Utils.money(0));
        next.setActualCost(null);
        next.setStatus("planned");
        next.setNotes("");
        next.setCurrentOrder(1);
        next.setCreatedAt(Utils.now());
        orderMapper.insert(next);

        sseService.emit(familyId, "order.archived", current.getTitle());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("archived", view.order(current, items, dishService.viewMap(familyId)));
        result.put("currentOrder", view.order(next, List.of(), dishService.viewMap(familyId)));
        return result;
    }

    @Transactional
    public void deleteHistory(String familyId, String orderId) {
        Entities.Order order = orderMapper.find(familyId, orderId);
        if (order == null) throw AppException.notFound("账单不存在或已被删除");
        if (order.getCurrentOrder() != null && order.getCurrentOrder() == 1) {
            throw AppException.badRequest("不能删除当前正在点的单");
        }
        itemMapper.deleteByOrder(orderId);
        orderMapper.delete(familyId, orderId);
        sseService.emit(familyId, "order.deleted", order.getTitle());
    }

    @Transactional
    public Map<String, Object> reorder(String familyId, String orderId) {
        Entities.Order source = orderMapper.find(familyId, orderId);
        if (source == null) throw AppException.notFound("账单不存在或已被删除");

        Entities.Order current = ensureCurrent(familyId);
        List<Entities.OrderItem> sourceItems = items(orderId);
        List<Entities.OrderItem> newItems = new ArrayList<>();
        double total = 0;
        int sort = 0;
        for (Entities.OrderItem item : sourceItems) {
            Entities.OrderItem copy = new Entities.OrderItem();
            copy.setId(Utils.uuid());
            copy.setOrderId(current.getId());
            copy.setDishId(item.getDishId());
            copy.setDishSnapshot(item.getDishSnapshot());
            copy.setQuantity(item.getQuantity());
            copy.setMember(item.getMember());
            copy.setNotes(item.getNotes());
            copy.setCustomPrice(item.getCustomPrice());
            copy.setSortOrder(sort++);
            newItems.add(copy);
            total += item.getCustomPrice().doubleValue() * item.getQuantity();
        }

        itemMapper.deleteByOrder(current.getId());
        current.setTitle("复刻·" + source.getTitle());
        current.setMealType(source.getMealType());
        current.setMealDate(Utils.today());
        current.setDinerCount(source.getDinerCount());
        current.setChef(source.getChef());
        current.setStatus("planned");
        current.setActualCost(null);
        current.setCurrentOrder(1);
        current.setTotalEstimatedCost(Utils.money(total));
        orderMapper.update(current);
        for (Entities.OrderItem item : newItems) itemMapper.insert(item);

        sseService.emit(familyId, "order.reordered", source.getTitle());
        return view.order(current, newItems, dishService.viewMap(familyId));
    }

    public Map<String, Object> historyView(String familyId, String orderId) {
        Entities.Order order = orderMapper.find(familyId, orderId);
        if (order == null) throw AppException.notFound("账单不存在或已被删除");
        return view.order(order, items(orderId), dishService.viewMap(familyId));
    }

    public int historyCount(String familyId) {
        return orderMapper.countHistory(familyId);
    }

    public Entities.Order currentEntity(String familyId) {
        return ensureCurrent(familyId);
    }

    public List<Map<String, Object>> rawHistory(String familyId) {
        return historyViews(familyId);
    }

    public void deleteAll(String familyId) {
        itemMapper.deleteByFamily(familyId);
        orderMapper.deleteByFamily(familyId);
    }

    public Map<String, Object> importOrder(String familyId, Map<String, Object> input, boolean current,
                                           Map<String, Map<String, Object>> dishesById) {
        DataNormalizer.OrderBundle bundle = normalizer.order(input, familyId, null, dishesById, current);
        orderMapper.insert(bundle.order());
        for (Entities.OrderItem item : bundle.items()) {
            item.setOrderId(bundle.order().getId());
            itemMapper.insert(item);
        }
        return view.order(bundle.order(), bundle.items(), dishesById);
    }
}
