package com.naomale.service;

import com.naomale.Entities;
import com.naomale.common.AppException;
import com.naomale.common.Jsons;
import com.naomale.mapper.DishMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DishService {
    private final DishMapper dishMapper;
    private final DataNormalizer normalizer;
    private final ViewService view;
    private final SseService sseService;

    public DishService(DishMapper dishMapper, DataNormalizer normalizer, ViewService view, SseService sseService) {
        this.dishMapper = dishMapper;
        this.normalizer = normalizer;
        this.view = view;
        this.sseService = sseService;
    }

    public List<Entities.Dish> list(String familyId) {
        return dishMapper.listByFamily(familyId);
    }

    public Map<String, Object> listView(String familyId) {
        return Map.of("dishes", view.dishes(list(familyId)));
    }

    @Transactional
    public Map<String, Object> save(String familyId, Map<String, Object> body) {
        String id = Jsons.str(body.get("id"), "");
        Entities.Dish existing = id.isBlank() ? null : dishMapper.find(familyId, id);
        Entities.Dish dish = normalizer.dish(body, familyId, existing);
        if (existing == null) {
            dishMapper.insert(dish);
            sseService.emit(familyId, "dish.created", dish.getName());
        } else {
            dishMapper.update(dish);
            sseService.emit(familyId, "dish.updated", dish.getName());
        }
        return view.dish(dish);
    }

    @Transactional
    public Map<String, Object> favorite(String familyId, String id, boolean favorite) {
        Entities.Dish dish = dishMapper.find(familyId, id);
        if (dish == null) throw AppException.notFound("菜品不存在或已被删除");
        dishMapper.updateFavorite(familyId, id, favorite ? 1 : 0);
        dish.setFavorite(favorite ? 1 : 0);
        sseService.emit(familyId, favorite ? "dish.favorited" : "dish.unfavorited", dish.getName());
        return view.dish(dish);
    }

    @Transactional
    public void delete(String familyId, String id) {
        Entities.Dish dish = dishMapper.find(familyId, id);
        if (dish == null) throw AppException.notFound("菜品不存在或已被删除");
        dishMapper.delete(familyId, id);
        sseService.emit(familyId, "dish.deleted", dish.getName());
    }

    public Map<String, Map<String, Object>> viewMap(String familyId) {
        Map<String, Map<String, Object>> result = new LinkedHashMap<>();
        for (Entities.Dish dish : list(familyId)) result.put(dish.getId(), view.dish(dish));
        return result;
    }
}
