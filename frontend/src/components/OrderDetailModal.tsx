import React from 'react';
import { X, Calendar, ChefHat, Users, Flame, DollarSign, RotateCcw, Trash2, CheckCircle2, Sparkles } from 'lucide-react';
import { MealOrder } from '../types';

interface OrderDetailModalProps {
  order: MealOrder | null;
  onClose: () => void;
  onReorder?: (order: MealOrder) => void;
  onDeleteOrder?: (orderId: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onReorder,
  onDeleteOrder,
}) => {
  if (!order) return null;

  const dinerCount = Math.max(1, order.dinerCount);

  // Calculate full meal nutrients
  const totalCalories = order.items.reduce((s, i) => s + (i.dish.nutrition?.calories || 0) * i.quantity, 0);
  const totalProtein = order.items.reduce((s, i) => s + (i.dish.nutrition?.protein || 0) * i.quantity, 0);
  const totalCarbs = order.items.reduce((s, i) => s + (i.dish.nutrition?.carbs || 0) * i.quantity, 0);
  const totalFat = order.items.reduce((s, i) => s + (i.dish.nutrition?.fat || 0) * i.quantity, 0);
  const totalFiber = order.items.reduce((s, i) => s + (i.dish.nutrition?.fiber || 0) * i.quantity, 0);
  const totalSodium = order.items.reduce((s, i) => s + (i.dish.nutrition?.sodium || 0) * i.quantity, 0);

  const perCal = Math.round(totalCalories / dinerCount);
  const perProtein = Math.round((totalProtein / dinerCount) * 10) / 10;
  const perCarbs = Math.round((totalCarbs / dinerCount) * 10) / 10;
  const perFat = Math.round((totalFat / dinerCount) * 10) / 10;
  const perFiber = Math.round((totalFiber / dinerCount) * 10) / 10;

  // Macro energy percentages
  const pCal = totalProtein * 4;
  const cCal = totalCarbs * 4;
  const fCal = totalFat * 9;
  const macroTotal = Math.max(1, pCal + cCal + fCal);
  const pPct = Math.round((pCal / macroTotal) * 100);
  const cPct = Math.round((cCal / macroTotal) * 100);
  const fPct = Math.round((fCal / macroTotal) * 100);

  const totalCost = order.actualCost !== undefined ? order.actualCost : order.totalEstimatedCost;
  const perPersonCost = Math.round((totalCost / dinerCount) * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-800 my-auto flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900">
          <div>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider block">
              订单档案 & 整餐营养学报告
            </span>
            <h3 className="font-serif-title text-base sm:text-xl font-bold text-stone-900 dark:text-stone-100">
              {order.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
          {/* Order Meta Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 text-xs">
            <div>
              <span className="text-[10px] text-stone-400 block">就餐日期</span>
              <span className="font-mono font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                {order.date}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block">餐别时段</span>
              <span className="font-bold text-stone-800 dark:text-stone-200 block mt-0.5">
                {order.mealType === 'breakfast'
                  ? '早餐'
                  : order.mealType === 'lunch'
                  ? '午餐'
                  : order.mealType === 'dinner'
                  ? '晚餐'
                  : '夜宵'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block">就餐人数</span>
              <span className="font-mono font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1 mt-0.5">
                <Users className="w-3.5 h-3.5 text-sky-600" />
                {order.dinerCount} 人
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block">开销总支出</span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm block mt-0.5">
                ¥{totalCost} <span className="text-[10px] text-stone-400 font-normal">(¥{perPersonCost}/人)</span>
              </span>
            </div>
          </div>

          {/* Dishes Itemized Receipt */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
              <span>包含菜品清单 ({order.items.length})</span>
              <span className="text-[10px] text-stone-400 font-normal">单价 x 份量</span>
            </h4>

            <div className="divide-y divide-stone-100 dark:divide-stone-800/80 bg-stone-50/50 dark:bg-stone-800/40 rounded-2xl border border-stone-200/80 dark:border-stone-700 p-2 sm:p-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={item.dish.coverImage}
                      alt={item.dish.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-lg object-cover bg-stone-100 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-stone-900 dark:text-stone-100 truncate">
                        {item.dish.name}
                      </div>
                      <div className="text-[10px] text-stone-400 flex items-center gap-1.5 mt-0.5 font-mono">
                        <span className="px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-sans">
                          {item.member || '全家'}
                        </span>
                        {item.notes && <span>· “{item.notes}”</span>}
                        <span>· {item.dish.nutrition?.calories || 0}kcal</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <div className="font-bold text-stone-800 dark:text-stone-200">
                      ¥{item.customPrice} x {item.quantity}
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                      = ¥{item.customPrice * item.quantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COMPLETE MEAL NUTRITIONAL SCIENCE CARD */}
          <div className="bg-gradient-to-br from-emerald-50/60 to-amber-50/60 dark:from-stone-800/80 dark:to-stone-800/40 rounded-2xl sm:rounded-3xl border border-emerald-200/60 dark:border-stone-700 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-stone-700 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-stone-100">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>整顿饭营养学全景剖析</span>
              </div>
              <span className="text-[10px] font-mono text-stone-500">
                人均 ~{perCal} kcal
              </span>
            </div>

            {/* Macro Ratio Bar */}
            <div>
              <div className="flex justify-between text-[11px] text-stone-600 dark:text-stone-300 mb-1.5 font-sans">
                <span>三大供能比</span>
                <span className="font-mono text-stone-400 text-[10px]">
                  蛋白 {pPct}% · 碳水 {cPct}% · 脂肪 {fPct}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden flex">
                <div style={{ width: `${pPct}%` }} className="bg-emerald-500" title={`蛋白质 ${pPct}%`} />
                <div style={{ width: `${cPct}%` }} className="bg-amber-500" title={`碳水 ${cPct}%`} />
                <div style={{ width: `${fPct}%` }} className="bg-rose-500" title={`脂肪 ${fPct}%`} />
              </div>
            </div>

            {/* Nutrients 6-Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono">
              <div className="bg-white/80 dark:bg-stone-900/80 p-2 rounded-xl border border-stone-200/60 dark:border-stone-700">
                <span className="text-[9px] text-stone-400 block font-sans">整餐总热量</span>
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200 tabular-nums">
                  {totalCalories} <span className="text-[9px] font-normal">kcal</span>
                </span>
              </div>
              <div className="bg-white/80 dark:bg-stone-900/80 p-2 rounded-xl border border-stone-200/60 dark:border-stone-700">
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-sans">优质蛋白</span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {Math.round(totalProtein)}g
                </span>
                <span className="text-[9px] text-stone-400 block">(人均{perProtein}g)</span>
              </div>
              <div className="bg-white/80 dark:bg-stone-900/80 p-2 rounded-xl border border-stone-200/60 dark:border-stone-700">
                <span className="text-[9px] text-amber-600 dark:text-amber-400 block font-sans">碳水化合物</span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                  {Math.round(totalCarbs)}g
                </span>
                <span className="text-[9px] text-stone-400 block">(人均{perCarbs}g)</span>
              </div>
              <div className="bg-white/80 dark:bg-stone-900/80 p-2 rounded-xl border border-stone-200/60 dark:border-stone-700">
                <span className="text-[9px] text-rose-600 dark:text-rose-400 block font-sans">优质脂肪</span>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                  {Math.round(totalFat)}g
                </span>
                <span className="text-[9px] text-stone-400 block">(人均{perFat}g)</span>
              </div>
              <div className="bg-white/80 dark:bg-stone-900/80 p-2 rounded-xl border border-stone-200/60 dark:border-stone-700">
                <span className="text-[9px] text-teal-600 dark:text-teal-400 block font-sans">膳食纤维</span>
                <span className="text-xs font-bold text-teal-700 dark:text-teal-300 tabular-nums">
                  {Math.round(totalFiber)}g
                </span>
                <span className="text-[9px] text-stone-400 block">(人均{perFiber}g)</span>
              </div>
              <div className="bg-white/80 dark:bg-stone-900/80 p-2 rounded-xl border border-stone-200/60 dark:border-stone-700">
                <span className="text-[9px] text-blue-600 dark:text-blue-400 block font-sans">钠盐预估</span>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                  {totalSodium}mg
                </span>
              </div>
            </div>

            {/* Nutrition balance assessment */}
            <div className="text-[11px] text-stone-600 dark:text-stone-300 bg-white/70 dark:bg-stone-900/70 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-700 leading-relaxed font-sans">
              🥗 搭配评估：人均热量约 {perCal} kcal、蛋白质 {perProtein}g，供能比符合中国膳食宝塔推荐，肉蔬搭配平衡，是一顿营养结构健康的家庭佳宴。
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex items-center justify-between gap-3">
          {onDeleteOrder && (
            <button
              onClick={() => {
                if (window.confirm('确认删除本条就餐订单记录吗？')) {
                  onDeleteOrder(order.id);
                  onClose();
                }
              }}
              className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除本单</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900"
            >
              关闭
            </button>

            {onReorder && (
              <button
                onClick={() => {
                  onReorder(order);
                  onClose();
                }}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>再来一单 (载入今日点单)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
