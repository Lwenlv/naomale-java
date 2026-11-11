import React from 'react';
import { ShoppingBag, Plus, Minus, Trash2, Calendar, Users, CheckCircle2, ClipboardList, Flame, ArrowRight, RotateCcw, Clock, Sparkles, ChevronRight, History } from 'lucide-react';
import { MealOrder, OrderItem, FamilyMember } from '../types';
import { NumberField } from './NumberField';
import { MealAiReview } from './MealAiReview';

interface FamilyOrderViewProps {
  currentOrder: MealOrder;
  ordersHistory: MealOrder[];
  onUpdateOrder: (order: MealOrder) => void;
  onArchiveOrder: (actualCost?: number) => void;
  onClearOrder: () => void;
  onNavigateToGallery: () => void;
  onReorder: (order: MealOrder) => void;
  onDeleteHistoryOrder: (orderId: string) => void;
  onViewOrderDetail: (order: MealOrder) => void;
  members: FamilyMember[];
}

export const FamilyOrderView: React.FC<FamilyOrderViewProps> = ({
  currentOrder,
  ordersHistory,
  onUpdateOrder,
  onArchiveOrder,
  onClearOrder,
  onNavigateToGallery,
  onReorder,
  onDeleteHistoryOrder,
  onViewOrderDetail,
  members,
}) => {
  const [activeSubTab, setActiveSubTab] = React.useState<'active' | 'history'>('active');
  const [copiedNotice, setCopiedNotice] = React.useState(false);
  const [showLiveNutrition, setShowLiveNutrition] = React.useState(true);
  const [actualCostInput, setActualCostInput] = React.useState<string>(
    currentOrder.actualCost !== undefined ? String(currentOrder.actualCost) : ''
  );

  // 切换到新的点单（归档 / 复刻后）时同步记账输入框
  React.useEffect(() => {
    setActualCostInput(currentOrder.actualCost !== undefined ? String(currentOrder.actualCost) : '');
  }, [currentOrder.id, currentOrder.actualCost]);

  const handleQuantityChange = (itemId: string, delta: number) => {
    const updatedItems = currentOrder.items
      .map((item) => {
        if (item.id === itemId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as OrderItem[];

    onUpdateOrder({
      ...currentOrder,
      items: updatedItems,
    });
  };

  const handlePriceChange = (itemId: string, newPrice: number) => {
    const updatedItems = currentOrder.items.map((item) => {
      if (item.id === itemId) {
        return { ...item, customPrice: Math.max(0, newPrice) };
      }
      return item;
    });

    onUpdateOrder({
      ...currentOrder,
      items: updatedItems,
    });
  };

  const handleNoteChange = (itemId: string, note: string) => {
    const updatedItems = currentOrder.items.map((item) => {
      if (item.id === itemId) {
        return { ...item, notes: note };
      }
      return item;
    });

    onUpdateOrder({
      ...currentOrder,
      items: updatedItems,
    });
  };

  const handleMemberChange = (itemId: string, member: string) => {
    const updatedItems = currentOrder.items.map((item) => {
      if (item.id === itemId) {
        return { ...item, member };
      }
      return item;
    });

    onUpdateOrder({
      ...currentOrder,
      items: updatedItems,
    });
  };

  const handleRemoveItem = (itemId: string) => {
    onUpdateOrder({
      ...currentOrder,
      items: currentOrder.items.filter((i) => i.id !== itemId),
    });
  };

  // Live Calculations for current order
  const totalCost = currentOrder.items.reduce((sum, item) => sum + item.customPrice * item.quantity, 0);
  const totalCalories = currentOrder.items.reduce((sum, item) => sum + (item.dish.nutrition?.calories || 0) * item.quantity, 0);
  const totalProtein = currentOrder.items.reduce((sum, item) => sum + (item.dish.nutrition?.protein || 0) * item.quantity, 0);
  const totalCarbs = currentOrder.items.reduce((sum, item) => sum + (item.dish.nutrition?.carbs || 0) * item.quantity, 0);
  const totalFat = currentOrder.items.reduce((sum, item) => sum + (item.dish.nutrition?.fat || 0) * item.quantity, 0);
  const totalFiber = currentOrder.items.reduce((sum, item) => sum + (item.dish.nutrition?.fiber || 0) * item.quantity, 0);
  const totalSodium = currentOrder.items.reduce((sum, item) => sum + (item.dish.nutrition?.sodium || 0) * item.quantity, 0);

  const dinerCount = Math.max(1, currentOrder.dinerCount);
  const perPersonCost = Math.round((totalCost / dinerCount) * 10) / 10;
  const perPersonCal = Math.round(totalCalories / dinerCount);
  const perPersonProtein = Math.round((totalProtein / dinerCount) * 10) / 10;

  // Macro Energy Percentages
  const pCal = totalProtein * 4;
  const cCal = totalCarbs * 4;
  const fCal = totalFat * 9;
  const macroTotal = Math.max(1, pCal + cCal + fCal);
  const pPct = Math.round((pCal / macroTotal) * 100);
  const cPct = Math.round((cCal / macroTotal) * 100);
  const fPct = Math.round((fCal / macroTotal) * 100);

  const handleCopyShoppingList = () => {
    const listMap = new Map<string, string>();
    currentOrder.items.forEach((item) => {
      item.dish.ingredients?.forEach((ing) => {
        listMap.set(ing.name, ing.amount || '适量');
      });
    });

    const lines = [
      `🛒【闹麻了点单 · 今日买菜备料单】`,
      `📅 就餐时段：${currentOrder.date} (${currentOrder.mealType}) | ${dinerCount}人就餐`,
      `🍽️ 点单：${currentOrder.items.map((i) => `${i.dish.name}x${i.quantity} (${i.member})`).join('、')}`,
      `💰 预估总额：¥${totalCost} (人均 ¥${perPersonCost})`,
      `🔥 整餐热量：${totalCalories} kcal (蛋白质 ${Math.round(totalProtein)}g)`,
      `\n📋 需采购食材明细：`,
    ];

    listMap.forEach((amt, name) => {
      lines.push(`• [ ] ${name} (${amt})`);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  const handleConfirmMeal = () => {
    const parsed = Number(actualCostInput);
    const finalActual =
      actualCostInput.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 ? parsed : totalCost;
    onArchiveOrder(finalActual);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-36 sm:pb-20">
      {/* Top Navigation Tabs: 正在点单 vs 历史订单 */}
      <div className="flex items-center justify-between p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl max-w-md mx-auto sm:mx-0">
        <button
          onClick={() => setActiveSubTab('active')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'active'
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
          <span>今日正在点单</span>
          {currentOrder.items.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold">
              {currentOrder.items.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'history'
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <History className="w-3.5 h-3.5 text-sky-600" />
          <span>历史点单记录 ({ordersHistory.length})</span>
        </button>
      </div>

      {activeSubTab === 'history' ? (
        /* HISTORICAL ORDERS VIEW */
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="font-serif-title font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                历史就餐与整餐营养档案
              </h3>
              <p className="text-xs text-stone-500">
                记录家庭每一次就餐的菜品组合、开销花费与完整营养学分析
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200/50">
              共 {ordersHistory.length} 顿
            </span>
          </div>

          {ordersHistory.length > 0 ? (
            <div className="space-y-3">
              {ordersHistory.map((histOrder) => {
                const histTotalCost = histOrder.actualCost !== undefined ? histOrder.actualCost : histOrder.totalEstimatedCost;
                const histCal = histOrder.items.reduce((s, i) => s + (i.dish.nutrition?.calories || 0) * i.quantity, 0);
                const histProtein = histOrder.items.reduce((s, i) => s + (i.dish.nutrition?.protein || 0) * i.quantity, 0);
                const histDiners = Math.max(1, histOrder.dinerCount);

                return (
                  <div
                    key={histOrder.id}
                    className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-sm hover:border-amber-300 dark:hover:border-amber-900 transition-colors"
                  >
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif-title font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                            {histOrder.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px]">
                            {histOrder.mealType === 'breakfast'
                              ? '早餐'
                              : histOrder.mealType === 'lunch'
                              ? '午餐'
                              : histOrder.mealType === 'dinner'
                              ? '晚餐'
                              : '夜宵'}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>{histOrder.date}</span>
                          <span>·</span>
                          <span>{histOrder.dinerCount}人就餐</span>
                          {histOrder.chef && (
                            <>
                              <span>·</span>
                              <span>主厨：{histOrder.chef}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Cost */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-stone-400 block font-mono">总支出</span>
                        <span className="font-mono font-bold text-base text-amber-700 dark:text-amber-400 tabular-nums">
                          ¥{histTotalCost}
                        </span>
                      </div>
                    </div>

                    {/* Dishes thumbnails list */}
                    <div className="py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                      {histOrder.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 bg-stone-50 dark:bg-stone-800/60 px-2 py-1 rounded-xl shrink-0 border border-stone-200/60 dark:border-stone-700 text-xs"
                        >
                          <img
                            src={item.dish.coverImage}
                            alt={item.dish.name}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                          <span className="font-medium text-stone-800 dark:text-stone-200">
                            {item.dish.name}
                          </span>
                          <span className="text-stone-400 font-mono">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {/* Nutrition Bar Snapshot for this historical meal */}
                    <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex items-center gap-3 text-stone-500">
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-500" />
                          <span>{histCal} kcal (人均{Math.round(histCal / histDiners)})</span>
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          蛋白 {Math.round(histProtein)}g
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => onViewOrderDetail(histOrder)}
                          className="px-2.5 py-1 text-xs text-stone-700 dark:text-stone-200 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 rounded-lg transition-colors font-medium flex items-center gap-1"
                        >
                          <span>查看营养报告</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => onReorder(histOrder)}
                          className="px-2.5 py-1 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 rounded-lg transition-colors font-bold flex items-center gap-1"
                          title="把这顿饭原样载入今日点单"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>再来一单</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-8">
              <History className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <h4 className="font-serif-title text-base font-bold text-stone-700 dark:text-stone-300">
                暂无历史点单记录
              </h4>
              <p className="text-xs text-stone-400 mt-1">
                今日点单完成后点击“已开饭·保存记账”，将自动记录至此。
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE ORDER VIEW */
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150">
          {currentOrder.items.length === 0 ? (
            <div className="py-16 sm:py-24 text-center max-w-sm mx-auto px-4 pb-24">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-100 dark:bg-stone-800 flex items-center justify-center text-amber-700 dark:text-amber-400 mx-auto mb-4 shadow-sm animate-bounce">
                <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <h2 className="font-serif-title text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1.5">
                餐桌静悄悄，还没人点单！
              </h2>
              <p className="text-xs text-stone-500 leading-relaxed mb-6">
                谁想吃什么赶紧去菜谱点两道，或者用盲盒抽签，免得做饭时七嘴八舌闹麻了！
              </p>
              <button
                onClick={onNavigateToGallery}
                className="w-full py-3 rounded-2xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <span>去菜谱挑选想吃的菜</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Order Meta Bar */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-widest block mb-0.5">
                      家庭点单中 · 今日各点各的
                    </span>
                    <input
                      type="text"
                      value={currentOrder.title}
                      onChange={(e) => onUpdateOrder({ ...currentOrder, title: e.target.value })}
                      className="font-serif-title text-lg sm:text-2xl font-bold text-stone-900 dark:text-stone-100 bg-transparent border-b border-dashed border-stone-300 dark:border-stone-700 focus:outline-none focus:border-amber-600 w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyShoppingList}
                      className="px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 rounded-xl transition-colors flex items-center gap-1.5 active:scale-95"
                    >
                      <ClipboardList className="w-3.5 h-3.5 text-amber-600" />
                      <span>{copiedNotice ? '已复制微信单！' : '发买菜清单'}</span>
                    </button>
                    <button
                      onClick={onClearOrder}
                      className="px-2.5 py-1.5 text-xs font-medium text-stone-400 hover:text-rose-500 transition-colors"
                    >
                      清空
                    </button>
                  </div>
                </div>

                {/* Parameters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 pt-3.5">
                  <div>
                    <label className="text-[10px] text-stone-400 block mb-1">就餐日期</label>
                    <input
                      type="date"
                      value={currentOrder.date}
                      onChange={(e) => onUpdateOrder({ ...currentOrder, date: e.target.value })}
                      className="w-full text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2.5 py-1.5 text-stone-800 dark:text-stone-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 block mb-1">餐别时段</label>
                    <select
                      value={currentOrder.mealType}
                      onChange={(e) => onUpdateOrder({ ...currentOrder, mealType: e.target.value as any })}
                      className="w-full text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2.5 py-1.5 text-stone-800 dark:text-stone-200"
                    >
                      <option value="breakfast">早餐</option>
                      <option value="lunch">午餐</option>
                      <option value="dinner">晚餐</option>
                      <option value="supper">夜宵</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 block mb-1">就餐人数</label>
                    <NumberField
                      min={1}
                      max={15}
                      step={1}
                      value={currentOrder.dinerCount}
                      onChange={(next) => onUpdateOrder({ ...currentOrder, dinerCount: next })}
                      ariaLabel="就餐人数"
                      className="w-full text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2.5 py-1.5 text-stone-800 dark:text-stone-200 font-mono tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 block mb-1">今日主厨</label>
                    <input
                      type="text"
                      value={currentOrder.chef}
                      onChange={(e) => onUpdateOrder({ ...currentOrder, chef: e.target.value })}
                      placeholder="如：爸爸掌勺"
                      className="w-full text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2.5 py-1.5 text-stone-800 dark:text-stone-200"
                    />
                  </div>
                </div>
              </div>

              {/* REAL-TIME MEAL NUTRITION ACCORDION CARD (Live Nutrition Science in Order View) */}
              <div className="bg-gradient-to-r from-emerald-50/80 via-amber-50/60 to-rose-50/50 dark:from-stone-900 dark:to-stone-900 rounded-2xl border border-emerald-200/60 dark:border-stone-800 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="font-serif-title font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                      本单营养概览 ({dinerCount}人就餐)
                    </span>
                  </div>
                  <button
                    onClick={() => setShowLiveNutrition(!showLiveNutrition)}
                    className="text-[11px] text-stone-500 hover:text-stone-900 underline"
                  >
                    {showLiveNutrition ? '收起' : '展开'}
                  </button>
                </div>

                {showLiveNutrition && (
                  <div className="space-y-3 pt-1">
                    {/* Macro ratio bar */}
                    <div>
                      <div className="flex justify-between text-[10px] sm:text-[11px] text-stone-500 font-mono mb-1">
                        <span>三大供能比</span>
                        <span>蛋白 {pPct}% · 碳水 {cPct}% · 脂肪 {fPct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden flex">
                        <div style={{ width: `${pPct}%` }} className="bg-emerald-500" title={`蛋白质 ${pPct}%`} />
                        <div style={{ width: `${cPct}%` }} className="bg-amber-500" title={`碳水 ${cPct}%`} />
                        <div style={{ width: `${fPct}%` }} className="bg-rose-500" title={`脂肪 ${fPct}%`} />
                      </div>
                    </div>

                    {/* Key nutrient numbers */}
                    <div className="grid grid-cols-4 gap-2 text-center font-mono">
                      <div className="bg-white/80 dark:bg-stone-800/80 p-1.5 rounded-lg border border-stone-200/60 dark:border-stone-700">
                        <span className="text-[9px] text-stone-400 block font-sans">总热量</span>
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200 tabular-nums">
                          {totalCalories}kcal
                        </span>
                        <span className="text-[8px] text-stone-400 block">人均{perPersonCal}</span>
                      </div>
                      <div className="bg-white/80 dark:bg-stone-800/80 p-1.5 rounded-lg border border-stone-200/60 dark:border-stone-700">
                        <span className="text-[9px] text-emerald-600 block font-sans">蛋白质</span>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                          {Math.round(totalProtein)}g
                        </span>
                        <span className="text-[8px] text-stone-400 block">人均{perPersonProtein}g</span>
                      </div>
                      <div className="bg-white/80 dark:bg-stone-800/80 p-1.5 rounded-lg border border-stone-200/60 dark:border-stone-700">
                        <span className="text-[9px] text-amber-600 block font-sans">碳水</span>
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                          {Math.round(totalCarbs)}g
                        </span>
                        <span className="text-[8px] text-stone-400 block">{cPct}%</span>
                      </div>
                      <div className="bg-white/80 dark:bg-stone-800/80 p-1.5 rounded-lg border border-stone-200/60 dark:border-stone-700">
                        <span className="text-[9px] text-rose-600 block font-sans">脂肪</span>
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                          {Math.round(totalFat)}g
                        </span>
                        <span className="text-[8px] text-stone-400 block">{fPct}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <MealAiReview items={currentOrder.items} dinerCount={dinerCount} />

              {/* Order Items List */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-serif-title text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                      已选菜品明细 ({currentOrder.items.length})
                    </h3>
                    <button
                      onClick={onNavigateToGallery}
                      className="text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>加菜</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {currentOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.dish.coverImage}
                            alt={item.dish.name}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover bg-stone-100 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-serif-title font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate">
                              {item.dish.name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono mt-0.5">
                              <span>{item.dish.cuisine}</span>
                              <span>·</span>
                              <span>{item.dish.nutrition?.calories}kcal</span>
                            </div>

                            <div className="flex items-center gap-1.5 mt-1.5">
                              <select
                                value={item.member}
                                onChange={(e) => handleMemberChange(item.id, e.target.value)}
                                className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-md px-1.5 py-0.5 border-none font-medium"
                              >
                                <option value="全家">全家</option>
                                {members.map((m) => (
                                  <option key={m.id} value={m.name}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>

                              <input
                                type="text"
                                placeholder="少辣少盐..."
                                value={item.notes}
                                onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                className="text-[10px] bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-md px-1.5 py-0.5 text-stone-700 dark:text-stone-300 w-28 sm:w-36 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
                          <div className="flex items-center bg-stone-50 dark:bg-stone-800 px-2 py-0.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-mono">
                            <span className="text-[10px] text-stone-400 mr-0.5">¥</span>
                            <NumberField
                              min={0}
                              step="any"
                              value={item.customPrice}
                              onChange={(next) => handlePriceChange(item.id, next)}
                              ariaLabel="菜品价格"
                              className="w-10 font-bold text-stone-800 dark:text-stone-200 bg-transparent text-center focus:outline-none tabular-nums"
                            />
                          </div>

                          <div className="flex items-center border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden bg-stone-50 dark:bg-stone-800">
                            <button
                              onClick={() => handleQuantityChange(item.id, -1)}
                              className="w-8 h-8 flex items-center justify-center text-stone-600 dark:text-stone-300 active:bg-stone-200 dark:active:bg-stone-700 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2 text-xs font-mono font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item.id, 1)}
                              className="w-8 h-8 flex items-center justify-center text-stone-600 dark:text-stone-300 active:bg-stone-200 dark:active:bg-stone-700 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="min-w-[45px] text-right font-mono font-bold text-xs text-amber-700 dark:text-amber-400 tabular-nums">
                            ¥{item.customPrice * item.quantity}
                          </div>

                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Summary Card */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
                    <h4 className="font-serif-title font-bold text-base text-stone-900 dark:text-stone-100 pb-2 border-b border-stone-100 dark:border-stone-800">
                      整单开销与记账
                    </h4>

                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-stone-500">
                        <span>总道数</span>
                        <span>{currentOrder.items.reduce((s, i) => s + i.quantity, 0)} 份菜</span>
                      </div>
                      <div className="flex justify-between text-stone-500">
                        <span>就餐人口</span>
                        <span>{dinerCount} 人</span>
                      </div>
                      <div className="flex justify-between text-stone-500">
                        <span>人均预估</span>
                        <span className="font-bold text-stone-800 dark:text-stone-200">¥{perPersonCost} /人</span>
                      </div>
                      <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-between items-baseline">
                        <span className="font-sans font-semibold text-stone-900 dark:text-stone-100 text-sm">
                          预估总支出
                        </span>
                        <span className="text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                          ¥{totalCost}
                        </span>
                      </div>
                    </div>

                    <div className="bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                      <label className="text-[10px] text-stone-400 block mb-1">
                        实际买菜记账 (选填)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-stone-400">¥</span>
                        <input
                          type="number"
                          placeholder={String(totalCost)}
                          value={actualCostInput}
                          onChange={(e) => setActualCostInput(e.target.value)}
                          className="w-full text-xs font-mono font-bold bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 tabular-nums focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleConfirmMeal}
                      className="hidden sm:flex w-full py-3 rounded-xl bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 text-white text-xs font-semibold items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>今日已开饭！保存并归档开销统计</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Sticky Checkout Bar */}
              <div className="fixed bottom-15 left-0 right-0 z-30 p-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 shadow-xl sm:hidden flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[11px] text-stone-500">预估合计</span>
                    <span className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400 tabular-nums">
                      ¥{totalCost}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">
                    人均 ¥{perPersonCost} · {totalCalories} kcal
                  </span>
                </div>

                <button
                  onClick={handleConfirmMeal}
                  className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>已开饭·保存记账</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
