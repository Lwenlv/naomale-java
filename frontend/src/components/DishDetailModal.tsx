import React from 'react';
import { X, Clock, Flame, Users, ChefHat, Check, Plus, Edit3, Heart, Sparkles, Trash2 } from 'lucide-react';
import { Dish, FamilyMember, NutritionInfo } from '../types';
import { ImageLightbox } from './ImageLightbox';

const MICRO_ROWS: Array<{ key: keyof NutritionInfo; label: string; unit: string }> = [
  { key: 'sugar', label: '糖', unit: 'g' },
  { key: 'vitaminA', label: '维生素 A', unit: 'μg' },
  { key: 'vitaminB1', label: '维生素 B1', unit: 'mg' },
  { key: 'vitaminB2', label: '维生素 B2', unit: 'mg' },
  { key: 'vitaminB6', label: '维生素 B6', unit: 'mg' },
  { key: 'vitaminC', label: '维生素 C', unit: 'mg' },
  { key: 'vitaminE', label: '维生素 E', unit: 'mg' },
  { key: 'folate', label: '叶酸', unit: 'μg' },
  { key: 'potassium', label: '钾', unit: 'mg' },
  { key: 'magnesium', label: '镁', unit: 'mg' },
  { key: 'calcium', label: '钙', unit: 'mg' },
];

interface DishDetailModalProps {
  dish: Dish | null;
  onClose: () => void;
  onAddToOrder: (dish: Dish, memberName: string) => void;
  onToggleFavorite: (dishId: string) => void;
  onEditDish?: (dish: Dish) => void;
  onDeleteDish?: (dish: Dish) => void;
  members: FamilyMember[];
}

export const DishDetailModal: React.FC<DishDetailModalProps> = ({
  dish,
  onClose,
  onAddToOrder,
  onToggleFavorite,
  onEditDish,
  onDeleteDish,
  members,
}) => {
  const [checkedIngredients, setCheckedIngredients] = React.useState<Record<number, boolean>>({});
  const [selectedMember, setSelectedMember] = React.useState<string>('全家');
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  if (!dish) return null;

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Macro calorie ratios
  const pCal = dish.nutrition.protein * 4;
  const cCal = dish.nutrition.carbs * 4;
  const fCal = dish.nutrition.fat * 9;
  const totalMacroCal = Math.max(1, pCal + cCal + fCal);
  const pPct = Math.round((pCal / totalMacroCal) * 100);
  const cPct = Math.round((cCal / totalMacroCal) * 100);
  const fPct = Math.round((fCal / totalMacroCal) * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-stone-50 dark:bg-stone-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-800 my-auto flex flex-col max-h-[95vh] sm:max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-stone-900/60 hover:bg-stone-900/80 text-white backdrop-blur-md transition-colors"
          title="关闭"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1">
          {/* Top Hero Image Banner */}
          <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden bg-stone-900">
            <img
              src={dish.coverImage}
              alt={dish.name}
              referrerPolicy="no-referrer"
              onClick={() => setLightboxOpen(true)}
              className="w-full h-full object-cover cursor-zoom-in"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
              <div>
                {/* Quiet metadata */}
                <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-300 font-sans-body mb-1.5">
                  <span>{dish.cuisine}</span>
                  <span aria-hidden="true">·</span>
                  <span>{dish.difficulty === 'easy' ? '新手快手' : dish.difficulty === 'medium' ? '家常熟练' : '功夫功夫菜'}</span>
                  <span aria-hidden="true">·</span>
                  <span>建议 {dish.servings} 人份</span>
                </div>

                <h1 className="font-serif-title text-2xl sm:text-4xl font-bold tracking-tight text-white">
                  {dish.name}
                </h1>
                {dish.pinyin && (
                  <p className="text-xs sm:text-sm text-amber-200/90 font-serif-title mt-0.5">
                    {dish.pinyin}
                  </p>
                )}
              </div>

              {/* Price & Favorite Button */}
              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1.5 rounded-xl bg-white/20 backdrop-blur-md text-white font-mono text-sm tabular-nums flex items-baseline gap-1">
                  <span className="text-xs text-amber-200">预估成本</span>
                  <span className="text-xl font-bold text-amber-300">¥{dish.estimatedPrice}</span>
                </div>
                <button
                  onClick={() => onToggleFavorite(dish.id)}
                  className={`p-2.5 rounded-xl backdrop-blur-md border border-white/20 transition-colors ${
                    dish.isFavorite ? 'bg-rose-500/80 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                  title={dish.isFavorite ? '取消收藏' : '加入收藏'}
                >
                  <Heart className={`w-5 h-5 ${dish.isFavorite ? 'fill-white' : ''}`} />
                </button>

                {onEditDish && (
                  <button
                    onClick={() => onEditDish(dish)}
                    className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 transition-colors"
                    title="编辑这道菜"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}

                {onDeleteDish && (
                  <button
                    onClick={() => onDeleteDish(dish)}
                    className="p-2.5 rounded-xl bg-white/20 hover:bg-rose-600/80 text-white backdrop-blur-md border border-white/20 transition-colors"
                    title="删除这道菜"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-stone-500">耗时总计</div>
                <div className="text-sm font-bold text-stone-800 dark:text-stone-200 font-mono">
                  {dish.prepTime + dish.cookTime} 分钟 (备料{dish.prepTime}m)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-stone-500">整份热量</div>
                <div className="text-sm font-bold text-stone-800 dark:text-stone-200 font-mono">
                  {dish.nutrition.calories} kcal
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-stone-500">做过次数</div>
                <div className="text-sm font-bold text-stone-800 dark:text-stone-200 font-mono">
                  已烹饪 {dish.cookCount} 次
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-stone-500">人均预估</div>
                <div className="text-sm font-bold text-stone-800 dark:text-stone-200 font-mono">
                  ¥{Math.round((dish.estimatedPrice / Math.max(1, dish.servings)) * 10) / 10} /人
                </div>
              </div>
            </div>
          </div>

          {/* Description Callout */}
          <div className="p-6">
            <p className="font-serif-title italic text-stone-700 dark:text-stone-300 text-base sm:text-lg leading-relaxed bg-amber-50/50 dark:bg-stone-800/40 p-4 rounded-2xl border border-amber-100 dark:border-stone-800">
              “{dish.description}”
            </p>
          </div>

          {/* Two-Column Details: Ingredients & Nutrition */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-6 pb-6">
            {/* Left Column: Ingredients Check-list */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif-title text-lg font-bold text-stone-900 dark:text-stone-100">
                    食材准备备料单
                  </h3>
                  <span className="text-xs text-stone-500">
                    点击勾选已备好食材
                  </span>
                </div>

                <div className="bg-white dark:bg-stone-900/60 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 divide-y divide-stone-100 dark:divide-stone-800">
                  {dish.ingredients.map((ing, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleIngredient(idx)}
                      className="py-2.5 flex items-center justify-between cursor-pointer group hover:bg-stone-50 dark:hover:bg-stone-800/30 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            checkedIngredients[idx]
                              ? 'bg-amber-600 border-amber-600 text-white'
                              : 'border-stone-300 dark:border-stone-600 group-hover:border-amber-500'
                          }`}
                        >
                          {checkedIngredients[idx] && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <span
                          className={`text-sm ${
                            checkedIngredients[idx]
                              ? 'line-through text-stone-400 dark:text-stone-500'
                              : 'text-stone-800 dark:text-stone-200 font-medium'
                          }`}
                        >
                          {ing.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-stone-500 dark:text-stone-400 tabular-nums">
                        {ing.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cooking Steps */}
              <div>
                <h3 className="font-serif-title text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">
                  烹饪步骤
                </h3>
                <div className="space-y-4">
                  {dish.steps.map((st) => (
                    <div
                      key={st.order}
                      className="bg-white dark:bg-stone-900/60 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 text-xs font-bold flex items-center justify-center font-mono">
                            {st.order}
                          </span>
                          <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                            {st.title}
                          </span>
                        </div>
                        {st.durationMins && (
                          <span className="text-xs font-mono text-stone-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            约 {st.durationMins} 分钟
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed pl-8">
                        {st.instruction}
                      </p>
                      {st.tip && (
                        <div className="ml-8 mt-2 text-xs text-amber-800 dark:text-amber-300/90 bg-amber-50/80 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/40 flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>主厨诀窍：{st.tip}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Nutrition Label Card */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm">
                <div className="flex items-center justify-between border-b-2 border-stone-900 dark:border-stone-100 pb-2 mb-3">
                  <h4 className="font-serif-title font-bold text-lg text-stone-900 dark:text-stone-100">
                    营养成分档案
                  </h4>
                  <span className="text-xs font-mono text-stone-500">每份整盘</span>
                </div>

                {/* Macro percentages */}
                <div className="my-4">
                  <div className="text-xs font-semibold text-stone-500 mb-2">三大产能营养素供能比</div>
                  <div className="w-full h-3 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden flex">
                    <div style={{ width: `${pPct}%` }} className="bg-emerald-500" title={`蛋白质 ${pPct}%`} />
                    <div style={{ width: `${cPct}%` }} className="bg-amber-500" title={`碳水 ${cPct}%`} />
                    <div style={{ width: `${fPct}%` }} className="bg-rose-500" title={`脂肪 ${fPct}%`} />
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-600 dark:text-stone-400 mt-2 font-mono">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      蛋白质 {pPct}% ({dish.nutrition.protein}g)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      碳水 {cPct}% ({dish.nutrition.carbs}g)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      脂肪 {fPct}% ({dish.nutrition.fat}g)
                    </span>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs font-mono">
                  <div className="py-2 flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">总热量 (Calories)</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{dish.nutrition.calories} kcal</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">优质蛋白质 (Protein)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{dish.nutrition.protein} g</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">碳水化合物 (Carbohydrate)</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{dish.nutrition.carbs} g</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">总脂肪 (Total Fat)</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{dish.nutrition.fat} g</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">膳食纤维 (Dietary Fiber)</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">{dish.nutrition.fiber} g</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">钠含量 (Sodium)</span>
                    <span className="font-bold text-stone-700 dark:text-stone-300">{dish.nutrition.sodium} mg</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <div className="text-xs font-semibold text-stone-500 mb-2">维生素与矿物质</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4">
                    {MICRO_ROWS.map((row) => (
                      <div key={row.key} className="py-1 flex justify-between gap-2 text-[11px] font-mono">
                        <span className="text-stone-500 dark:text-stone-400 font-sans">{row.label}</span>
                        <span className="font-bold text-stone-700 dark:text-stone-300 whitespace-nowrap">
                          {dish.nutrition[row.key] ?? 0} {row.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dietary Tags */}
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-1.5">
                  {dish.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Add to Today's Order Panel */}
              <div className="bg-amber-50/80 dark:bg-stone-800/80 rounded-2xl border border-amber-200/80 dark:border-stone-700 p-5 space-y-4">
                <div className="text-sm font-bold text-stone-900 dark:text-stone-100 font-serif-title">
                  将此菜品加入家庭点单
                </div>

                <div>
                  <label className="text-xs text-stone-500 dark:text-stone-400 mb-1.5 block">
                    谁想吃？(点菜人)
                  </label>
                  <select
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                    className="w-full text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 px-3 py-2 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="全家">全家一起吃 (默认)</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    onAddToOrder(dish, selectedMember);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>加入今日点单</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ImageLightbox src={lightboxOpen ? dish.coverImage : null} alt={dish.name} onClose={() => setLightboxOpen(false)} />
    </div>
  );
};
