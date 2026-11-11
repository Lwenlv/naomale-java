import React from 'react';
import { Activity, ArrowRight } from 'lucide-react';
import { MealOrder, Dish, OrderItem, NutritionInfo } from '../types';
import { MealAiReview } from './MealAiReview';

interface NutritionViewProps {
  currentOrder: MealOrder;
  allDishes: Dish[];
  onNavigateToOrder: () => void;
}

const MICRO_FIELDS: Array<{ key: keyof NutritionInfo; label: string; unit: string }> = [
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

export const NutritionView: React.FC<NutritionViewProps> = ({
  currentOrder,
  allDishes,
  onNavigateToOrder,
}) => {
  const [selectedDishId, setSelectedDishId] = React.useState<string>(allDishes[0]?.id || '');

  // 菜谱被删除/替换后，保持下拉框选中项有效
  React.useEffect(() => {
    if (allDishes.length === 0) {
      if (selectedDishId) setSelectedDishId('');
      return;
    }
    if (!allDishes.some((dish) => dish.id === selectedDishId)) {
      setSelectedDishId(allDishes[0].id);
    }
  }, [allDishes, selectedDishId]);

  const dinerCount = Math.max(1, currentOrder.dinerCount);
  const hasOrderItems = currentOrder.items.length > 0;

  // Aggregate current meal nutrients
  const totalCalories = currentOrder.items.reduce((s, i) => s + i.dish.nutrition.calories * i.quantity, 0);
  const totalProtein = currentOrder.items.reduce((s, i) => s + i.dish.nutrition.protein * i.quantity, 0);
  const totalCarbs = currentOrder.items.reduce((s, i) => s + i.dish.nutrition.carbs * i.quantity, 0);
  const totalFat = currentOrder.items.reduce((s, i) => s + i.dish.nutrition.fat * i.quantity, 0);
  const totalFiber = currentOrder.items.reduce((s, i) => s + i.dish.nutrition.fiber * i.quantity, 0);
  const totalSodium = currentOrder.items.reduce((s, i) => s + i.dish.nutrition.sodium * i.quantity, 0);

  // Per capita
  const perCal = Math.round(totalCalories / dinerCount);
  const perProtein = Math.round((totalProtein / dinerCount) * 10) / 10;
  const perCarbs = Math.round((totalCarbs / dinerCount) * 10) / 10;
  const perFat = Math.round((totalFat / dinerCount) * 10) / 10;
  const perFiber = Math.round((totalFiber / dinerCount) * 10) / 10;
  const perSodium = Math.round(totalSodium / dinerCount);

  // Macro Energy Percentages: Protein 4kcal/g, Carbs 4kcal/g, Fat 9kcal/g
  const proteinCal = totalProtein * 4;
  const carbsCal = totalCarbs * 4;
  const fatCal = totalFat * 9;
  const macroTotalCal = Math.max(1, proteinCal + carbsCal + fatCal);

  const proteinPct = Math.round((proteinCal / macroTotalCal) * 100);
  const carbsPct = Math.round((carbsCal / macroTotalCal) * 100);
  const fatPct = Math.round((fatCal / macroTotalCal) * 100);

  // Recommended reference for an adult meal (1/3 of daily NRV: ~700kcal, 22g protein, 20g fat, 90g carb, 8g fiber, 600mg sodium)
  const refCalPerMeal = 700;
  const refProteinPerMeal = 25;
  const refCarbsPerMeal = 90;
  const refFatPerMeal = 22;
  const refFiberPerMeal = 10;
  const refSodiumPerMeal = 650;

  // Selected dish for inspection
  const inspectedDish = allDishes.find((d) => d.id === selectedDishId) || allDishes[0];

  return (
    <div className="space-y-4 sm:space-y-6 pb-24">
      {/* View Header */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block mb-0.5">
            本餐营养分析
          </span>
          <h2 className="font-serif-title text-lg sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
            这一桌菜，营养结构怎么样？
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            数据来源：当前点单的菜品、数量、就餐人数；下方所有数字都来自这份点单汇总。
          </p>
        </div>
        <div className="text-[10px] text-stone-400 bg-stone-50 dark:bg-stone-800/50 rounded-xl px-3 py-2 border border-stone-200/70 dark:border-stone-700">
          参考标准：中国膳食指南 & WHO 单餐推荐
        </div>
      </div>

      {hasOrderItems && <MealAiReview items={currentOrder.items} dinerCount={dinerCount} />}

      {/* Main Meal Nutrition Dashboard */}
      {hasOrderItems ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left Column: Donut Chart & Macro Ratios */}
          <div className="lg:col-span-5 bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 p-4 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2 mb-3">
                <h3 className="font-serif-title font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                  三大产能营养素供能比
                </h3>
                <span className="text-xs text-stone-400 font-mono">{dinerCount}人就餐</span>
              </div>

              {/* Circular SVG Donut Chart */}
              <div className="flex flex-col items-center justify-center my-6 relative">
                <div className="w-48 h-48 relative flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
                    {/* Background circle */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="16" />
                    {/* Protein stroke */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="16"
                      strokeDasharray={`${proteinPct * 2.51} 251.2`}
                      strokeDashoffset="0"
                    />
                    {/* Carbs stroke */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#f59e0b"
                      strokeWidth="16"
                      strokeDasharray={`${carbsPct * 2.51} 251.2`}
                      strokeDashoffset={`${-proteinPct * 2.51}`}
                    />
                    {/* Fat stroke */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#f43f5e"
                      strokeWidth="16"
                      strokeDasharray={`${fatPct * 2.51} 251.2`}
                      strokeDashoffset={`${-(proteinPct + carbsPct) * 2.51}`}
                    />
                  </svg>

                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[11px] text-stone-400 uppercase tracking-wider">人均热量</span>
                    <span className="font-mono text-xl font-bold text-stone-800 dark:text-stone-100 tabular-nums">
                      {perCal}
                    </span>
                    <span className="text-[10px] text-stone-500">kcal/人</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="grid grid-cols-3 gap-3 w-full mt-4 text-center">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/30">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mx-auto mb-1" />
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">蛋白质</div>
                    <div className="font-mono font-bold text-xs text-stone-800 dark:text-stone-200">{proteinPct}%</div>
                    <div className="text-[10px] text-stone-400">{perProtein}g/人</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/30">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mx-auto mb-1" />
                    <div className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">碳水化合物</div>
                    <div className="font-mono font-bold text-xs text-stone-800 dark:text-stone-200">{carbsPct}%</div>
                    <div className="text-[10px] text-stone-400">{perCarbs}g/人</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/30">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mx-auto mb-1" />
                    <div className="text-[11px] text-rose-800 dark:text-rose-300 font-semibold">优质脂肪</div>
                    <div className="font-mono font-bold text-xs text-stone-800 dark:text-stone-200">{fatPct}%</div>
                    <div className="text-[10px] text-stone-400">{perFat}g/人</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 关键微量元素，放在首屏可见位置 */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'sugar' as const, label: '糖', unit: 'g' },
                { key: 'vitaminC' as const, label: '维C', unit: 'mg' },
                { key: 'folate' as const, label: '叶酸', unit: 'μg' },
                { key: 'potassium' as const, label: '钾', unit: 'mg' },
              ].map((item) => {
                const total = currentOrder.items.reduce(
                  (sum, orderItem) => sum + (orderItem.dish.nutrition[item.key] ?? 0) * orderItem.quantity,
                  0
                );
                const per = total / dinerCount;
                const value = per >= 100 ? Math.round(per) : Math.round(per * 10) / 10;
                return (
                  <div key={item.key} className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/70 dark:border-stone-700 text-center">
                    <div className="text-[10px] text-stone-400">{item.label}</div>
                    <div className="text-xs font-bold text-stone-800 dark:text-stone-200 tabular-nums">
                      {value}<span className="text-[9px] text-stone-400 ml-0.5">{item.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Benchmark Guideline Note */}
            <div className="text-[11px] text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/40 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 leading-relaxed">
              💡 黄金供能比参考：蛋白质 15%~20%，碳水化合物 50%~60%，脂肪 20%~30%。当前本餐蛋白质供能比为{' '}
              <span className="font-bold text-stone-800 dark:text-stone-200">{proteinPct}%</span>。
            </div>
          </div>

          {/* Right Column: Per-Capita Progress & Diagnostic Advice */}
          <div className="lg:col-span-7 space-y-6">
            {/* Progress Bars against standard reference */}
            <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                <h3 className="font-serif-title font-bold text-lg text-stone-900 dark:text-stone-100">
                  单人正餐推荐摄入达成度 (NRV%)
                </h3>
                <span className="text-xs text-stone-400">对比单餐标准推荐</span>
              </div>

              {/* Nutrients List */}
              <div className="space-y-4 pt-1">
                {/* Calories */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-stone-600 dark:text-stone-300 font-sans">正餐热量 (kcal)</span>
                    <span className="text-stone-900 dark:text-stone-100 font-bold">
                      {perCal} / {refCalPerMeal} kcal ({Math.round((perCal / refCalPerMeal) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, (perCal / refCalPerMeal) * 100)}%` }}
                      className="h-full bg-amber-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Protein */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-stone-600 dark:text-stone-300 font-sans">蛋白质 (Protein)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {perProtein}g / {refProteinPerMeal}g ({Math.round((perProtein / refProteinPerMeal) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, (perProtein / refProteinPerMeal) * 100)}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Fiber */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-stone-600 dark:text-stone-300 font-sans">膳食纤维 (Fiber)</span>
                    <span className="text-teal-600 dark:text-teal-400 font-bold">
                      {perFiber}g / {refFiberPerMeal}g ({Math.round((perFiber / refFiberPerMeal) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, (perFiber / refFiberPerMeal) * 100)}%` }}
                      className="h-full bg-teal-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Sodium */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-stone-600 dark:text-stone-300 font-sans">钠盐控制 (Sodium)</span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                      {perSodium}mg / {refSodiumPerMeal}mg
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, (perSodium / refSodiumPerMeal) * 100)}%` }}
                      className={`h-full rounded-full ${perSodium > refSodiumPerMeal ? 'bg-rose-500' : 'bg-blue-500'}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty prompt for current order */
        <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
          <Activity className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <h4 className="font-serif-title text-base font-bold text-stone-700 dark:text-stone-200">
            今日点单暂无菜品
          </h4>
          <p className="text-xs text-stone-500 mt-1 mb-4">
            先在家庭点单中选好今天的午餐或晚餐，系统将实时为您透视全餐营养。
          </p>
          <button
            onClick={onNavigateToOrder}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <span>去点单</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {hasOrderItems && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 p-4 sm:p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
            <h3 className="font-serif-title font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
              维生素与矿物质（人均）
            </h3>
            <span className="text-[11px] text-stone-400">整餐总量 ÷ {dinerCount} 人</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {MICRO_FIELDS.map((field) => {
              const total = currentOrder.items.reduce(
                (sum, item) => sum + (item.dish.nutrition[field.key] ?? 0) * item.quantity,
                0
              );
              const per = total / dinerCount;
              const value = per >= 100 ? Math.round(per) : Math.round(per * 10) / 10;
              return (
                <div key={field.key} className="rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700 p-2.5">
                  <span className="text-[10px] text-stone-400 block font-sans">{field.label}</span>
                  <span className="text-sm font-bold text-stone-800 dark:text-stone-200 tabular-nums">
                    {value}<span className="text-[10px] text-stone-400 ml-0.5">{field.unit}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Single Dish Nutrition Fact Inspector */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
          <div>
            <h3 className="font-serif-title font-bold text-lg text-stone-900 dark:text-stone-100">
              单品营养放大镜
            </h3>
            <p className="text-xs text-stone-500">独立查询某一道菜，不计入上方本餐汇总。</p>
          </div>

          {/* Dish Picker */}
          <select
            value={selectedDishId}
            onChange={(e) => setSelectedDishId(e.target.value)}
            className="text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3 py-2 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {allDishes.length === 0 && <option value="">暂无菜谱</option>}
            {allDishes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.cuisine})
              </option>
            ))}
          </select>
        </div>

        {allDishes.length === 0 && (
          <p className="text-xs text-stone-500 bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3">
            菜谱库为空。录入菜品后，这里会显示单品的热量、蛋白质、碳水、脂肪、纤维与成本。
          </p>
        )}

        {inspectedDish && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800">
              <img
                src={inspectedDish.coverImage}
                alt={inspectedDish.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700">
                <span className="text-[11px] text-stone-500 block font-sans">热量 (Calories)</span>
                <span className="text-lg font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                  {inspectedDish.nutrition.calories} kcal
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40">
                <span className="text-[11px] text-emerald-800 dark:text-emerald-400 block font-sans">优质蛋白</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {inspectedDish.nutrition.protein} g
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40">
                <span className="text-[11px] text-amber-800 dark:text-amber-400 block font-sans">碳水化合物</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {inspectedDish.nutrition.carbs} g
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40">
                <span className="text-[11px] text-rose-800 dark:text-rose-400 block font-sans">脂肪</span>
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {inspectedDish.nutrition.fat} g
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/40">
                <span className="text-[11px] text-teal-800 dark:text-teal-400 block font-sans">膳食纤维</span>
                <span className="text-lg font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                  {inspectedDish.nutrition.fiber} g
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700">
                <span className="text-[11px] text-stone-500 block font-sans">预估单份成本</span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  ¥{inspectedDish.estimatedPrice}
                </span>
              </div>
            </div>

            <div className="md:col-span-12 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 font-mono">
              {MICRO_FIELDS.map((field) => (
                <div key={field.key} className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700">
                  <span className="text-[10px] text-stone-500 block font-sans">{field.label}</span>
                  <span className="text-sm font-bold text-stone-800 dark:text-stone-200 tabular-nums">
                    {inspectedDish.nutrition[field.key] ?? 0}
                    <span className="text-[10px] text-stone-400 ml-0.5">{field.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
