import React from 'react';
import { Search, Sparkles, Plus, Utensils, Flame, Dices } from 'lucide-react';
import { Dish, FamilyMember } from '../types';
import { DishCard } from './DishCard';

interface DishGalleryProps {
  dishes: Dish[];
  onViewDetail: (dish: Dish) => void;
  onQuickAdd: (dish: Dish, memberName: string) => void;
  onToggleFavorite: (dishId: string) => void;
  onOpenAddDish: () => void;
  onStartRandomDraw: () => void;
  members: FamilyMember[];
  heroImage?: string;
  heroFit?: 'cover' | 'contain' | 'natural';
}

export const DishGallery: React.FC<DishGalleryProps> = ({
  dishes,
  onViewDetail,
  onQuickAdd,
  onToggleFavorite,
  onOpenAddDish,
  onStartRandomDraw,
  members,
  heroImage,
  heroFit = 'cover',
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<'default' | 'cooked' | 'time' | 'price' | 'favorite'>('default');

  const categories: Array<{ id: string; label: string }> = [
    { id: 'all', label: '全部' },
    { id: 'meat', label: '硬菜大肉' },
    { id: 'seafood', label: '海鲜水产' },
    { id: 'veggie', label: '清爽时蔬' },
    { id: 'soup', label: '滋补靓汤' },
    { id: 'light', label: '控卡轻食' },
    { id: 'fruit', label: '水果' },
    { id: 'staple', label: '主食面点' },
  ];

  const filteredDishes = React.useMemo(() => {
    return dishes
      .filter((dish) => {
        if (selectedCategory !== 'all' && dish.category !== selectedCategory) {
          return false;
        }
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase();
          const matchName = dish.name.toLowerCase().includes(query);
          const matchCuisine = dish.cuisine.toLowerCase().includes(query);
          const matchTags = dish.tags.some((t) => t.toLowerCase().includes(query));
          const matchIngredients = dish.ingredients.some((i) => i.name.toLowerCase().includes(query));
          if (!matchName && !matchCuisine && !matchTags && !matchIngredients) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'favorite') {
          return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
        }
        if (sortBy === 'cooked') {
          return b.cookCount - a.cookCount;
        }
        if (sortBy === 'time') {
          return a.prepTime + a.cookTime - (b.prepTime + b.cookTime);
        }
        if (sortBy === 'price') {
          return a.estimatedPrice - b.estimatedPrice;
        }
        return 0;
      });
  }, [dishes, selectedCategory, searchTerm, sortBy]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* 杂志式 Hero：文字与图片分区，图片完整不叠字 */}
      <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm grid lg:grid-cols-[1.05fr_1.25fr]">
        <div className="order-2 lg:order-1 p-5 sm:p-8 lg:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-stone-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>家庭餐桌 · 已收录 {dishes.length} 道菜</span>
          </div>

          <h1 className="font-serif-title text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-50 mt-3 leading-[1.18]">
            今天吃啥，
            <br />
            <span className="text-amber-700 dark:text-amber-400">别吵了。</span>
          </h1>

          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-3 leading-relaxed max-w-md">
            一人点一道，抽签盲盒盲选。把众口难调变成一桌好菜。
          </p>

          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={onStartRandomDraw}
              className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>盲盒抽签吃什么</span>
            </button>

            <button
              onClick={onOpenAddDish}
              className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>录新菜</span>
            </button>
          </div>
        </div>

        {heroFit === 'natural' ? (
          <div className="relative order-1 lg:order-2 bg-[#fff8ec] flex items-center justify-center">
            <img
              src={heroImage || "/images/theme-naomale/hero-home.png"}
              alt="闹麻了点单"
              referrerPolicy="no-referrer"
              className="w-full h-auto"
            />
          </div>
        ) : (
          <div className={`relative order-1 lg:order-2 h-[240px] sm:h-[300px] lg:h-auto lg:min-h-[400px] ${heroFit === 'contain' ? 'bg-[#fff8ec]' : 'bg-stone-900'}`}>
            <img
              src={heroImage || "/images/theme-naomale/hero-home.png"}
              alt="闹麻了点单"
              referrerPolicy="no-referrer"
              className={`absolute inset-0 w-full h-full ${heroFit === 'contain' ? 'object-contain' : 'object-cover'}`}
            />
          </div>
        )}
      </div>

      {dishes.length === 0 ? (
        /* 空库引导：从零开始 */
        <div className="py-14 px-6 text-center bg-white dark:bg-stone-900 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <Utensils className="w-7 h-7" />
          </div>
          <h4 className="font-serif-title text-base font-bold text-stone-800 dark:text-stone-200">
            菜谱库还是空的
          </h4>
          <p className="text-xs text-stone-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
            从第一道家常菜开始吧。录入后会自动保存，换设备也能看到。
          </p>
          <button
            onClick={onOpenAddDish}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>录入第一道菜</span>
          </button>
          <p className="text-[10px] text-stone-400 mt-3">
            也可以直接上传菜谱图片，让 AI 帮你识别录入
          </p>
        </div>
      ) : (
        <>
          {/* Horizontal Smooth Category Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap shrink-0 active:scale-95 ${
                  selectedCategory === cat.id
                    ? 'bg-amber-700 dark:bg-amber-600 text-white font-bold shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search and Sort Toolbar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜菜名、配料或风味..."
                className="w-full text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 pl-8.5 pr-3 py-2 text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-2.5 py-2 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm shrink-0"
            >
              <option value="default">默认</option>
              <option value="cooked">最常做</option>
              <option value="time">用时短</option>
              <option value="price">成本低</option>
              <option value="favorite">心愿</option>
            </select>
          </div>

          {/* TWO-COLUMN GRID ON MOBILE (grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4) */}
          {filteredDishes.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filteredDishes.map((dish) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  onViewDetail={onViewDetail}
                  onQuickAdd={onQuickAdd}
                  onToggleFavorite={onToggleFavorite}
                  members={members}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
              <Utensils className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <h4 className="font-serif-title text-sm font-bold text-stone-700 dark:text-stone-300">
                没有找到匹配的菜品
              </h4>
              <p className="text-xs text-stone-400 mt-1">
                换个关键词试试，或直接录入新菜品。
              </p>
              <button
                onClick={onOpenAddDish}
                className="mt-3 px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>录入这道菜</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
