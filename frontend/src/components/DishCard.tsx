import React from 'react';
import { Clock, Plus, Flame, Heart } from 'lucide-react';
import { Dish, FamilyMember } from '../types';

interface DishCardProps {
  dish: Dish;
  onViewDetail: (dish: Dish) => void;
  onQuickAdd: (dish: Dish, memberName: string) => void;
  onToggleFavorite: (dishId: string) => void;
  members: FamilyMember[];
}

export const DishCard: React.FC<DishCardProps> = ({
  dish,
  onViewDetail,
  onQuickAdd,
  onToggleFavorite,
  members,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [showMemberPicker, setShowMemberPicker] = React.useState(false);

  const totalTime = dish.prepTime + dish.cookTime;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.action-btn')) return;
    onViewDetail(dish);
  };

  const handleQuickAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd(dish, '全家');
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative cursor-pointer flex flex-col bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800 shadow-sm transition-all duration-200 active:scale-[0.98] hover:shadow-md hover:border-amber-300 dark:hover:border-amber-900/60"
    >
      {/* 1:1 or 4:3 Food Photo */}
      <div className="relative aspect-[1/1] sm:aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
        {!imageError && dish.coverImage ? (
          <img
            src={dish.coverImage}
            alt={dish.name}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-100/50 to-stone-200/50 dark:from-stone-800 dark:to-stone-900 p-2 text-center">
            <span className="font-serif-title text-sm sm:text-base font-bold text-stone-700 dark:text-stone-300 line-clamp-1">
              {dish.name}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5">{dish.cuisine}</span>
          </div>
        )}

        {/* Favorite Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(dish.id);
          }}
          className="action-btn absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white/90 transition-transform active:scale-90"
          title={dish.isFavorite ? '取消收藏' : '加入心愿'}
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              dish.isFavorite ? 'fill-rose-500 text-rose-500' : ''
            }`}
          />
        </button>

        {/* Price Tag in bottom left of photo */}
        <div className="absolute bottom-2 left-2 bg-stone-950/85 backdrop-blur-md px-2 py-0.5 rounded-md text-white text-[11px] font-mono tabular-nums flex items-baseline gap-0.5 shadow-sm">
          <span className="text-[9px] text-amber-300 font-sans">¥</span>
          <span className="font-bold text-xs sm:text-sm text-amber-300">{dish.estimatedPrice}</span>
        </div>

        {/* Cook Time or Kcal in bottom right of photo */}
        <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-stone-200 font-mono tabular-nums flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5 text-stone-300" />
          <span>{totalTime}m</span>
        </div>
      </div>

      {/* Content Section - Compact for 2-column mobile */}
      <div className="p-2.5 sm:p-3 flex flex-col flex-1 justify-between gap-1.5">
        <div>
          {/* Metadata line: quiet unboxed text (§1.A) */}
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-stone-400 dark:text-stone-500 font-sans-body mb-0.5 truncate">
            <span>{dish.cuisine}</span>
            <span aria-hidden="true">·</span>
            <span className="text-orange-600 dark:text-orange-400 flex items-center gap-0.5 font-mono">
              <Flame className="w-2.5 h-2.5 inline" />
              {dish.nutrition.calories}kcal
            </span>
          </div>

          {/* Dish Name */}
          <h4 className="font-serif-title font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
            {dish.name}
          </h4>
        </div>

        {/* Bottom row: Cook count / tag & Touch Add Button */}
        <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800/80">
          <span className="text-[10px] text-stone-500 font-mono tabular-nums truncate max-w-[70px] sm:max-w-none">
            {dish.cookCount > 0 ? `做过${dish.cookCount}次` : `${dish.servings}人份`}
          </span>

          {/* Big touchable 1-tap add button (with member picker on long press/secondary click) */}
          <div className="relative">
            <button
              onClick={handleQuickAddClick}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowMemberPicker(true);
              }}
              className="action-btn min-w-[34px] min-h-[34px] w-8 h-8 rounded-xl bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white flex items-center justify-center shadow-sm transition-transform active:scale-90"
              title="一键点这道菜 (右键或长按可指派点菜人)"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Member Picker Popover */}
            {showMemberPicker && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMemberPicker(false);
                  }}
                />
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full right-0 mb-2 w-44 rounded-xl bg-white dark:bg-stone-900 shadow-xl border border-stone-200 dark:border-stone-800 p-2 z-40 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-2 py-1 text-[10px] text-stone-400 font-medium">指派点菜人</div>
                  <div className="space-y-1 mt-1">
                    {members.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          onQuickAdd(dish, m.name);
                          setShowMemberPicker(false);
                        }}
                        className="w-full px-2 py-1.5 text-left text-xs text-stone-700 dark:text-stone-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <span className={`w-2 h-2 rounded-full ${m.avatarBg}`} />
                        <span>{m.name}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        onQuickAdd(dish, '全家');
                        setShowMemberPicker(false);
                      }}
                      className="w-full px-2 py-1 text-left text-xs font-semibold text-amber-800 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-950/50 rounded-lg border-t border-stone-100 dark:border-stone-800 mt-1 pt-1.5"
                    >
                      全家一起吃
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
