import React from 'react';
import { Dices, Sparkles, RefreshCw, Plus, Users, Utensils, ArrowRight, Flame, Heart, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Dish } from '../types';

interface RandomDecisionViewProps {
  dishes: Dish[];
  onAddCombinationToOrder: (selectedDishes: Dish[]) => void;
}

export const RandomDecisionView: React.FC<RandomDecisionViewProps> = ({
  dishes,
  onAddCombinationToOrder,
}) => {
  const [dinerPreset, setDinerPreset] = React.useState<number>(3);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [drawnDishes, setDrawnDishes] = React.useState<Dish[]>([]);
  const [hasDrawn, setHasDrawn] = React.useState(false);

  const meatPool = dishes.filter((d) => d.category === 'meat');
  const seafoodPool = dishes.filter((d) => d.category === 'seafood');
  const veggiePool = dishes.filter((d) => d.category === 'veggie');
  const soupPool = dishes.filter((d) => d.category === 'soup');
  const lightPool = dishes.filter((d) => d.category === 'light');

  const pickRandom = (pool: Dish[], excludeIds: Set<string>): Dish | null => {
    const candidates = pool.filter((d) => !excludeIds.has(d.id));
    if (candidates.length === 0) {
      return pool[Math.floor(Math.random() * pool.length)] || dishes[0];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  const generateMealCombo = () => {
    const selected: Dish[] = [];
    const usedIds = new Set<string>();

    if (dinerPreset === 1) {
      const d1 = pickRandom([...meatPool, ...seafoodPool, ...lightPool], usedIds);
      if (d1) {
        selected.push(d1);
        usedIds.add(d1.id);
      }
      const d2 = pickRandom([...veggiePool, ...soupPool], usedIds);
      if (d2) selected.push(d2);
    } else if (dinerPreset === 2) {
      const m = pickRandom([...meatPool, ...seafoodPool], usedIds);
      if (m) {
        selected.push(m);
        usedIds.add(m.id);
      }
      const v = pickRandom(veggiePool, usedIds);
      if (v) {
        selected.push(v);
        usedIds.add(v.id);
      }
      const s = pickRandom(soupPool, usedIds);
      if (s) {
        selected.push(s);
        usedIds.add(s.id);
      }
    } else if (dinerPreset === 3) {
      const m = pickRandom(meatPool, usedIds);
      if (m) {
        selected.push(m);
        usedIds.add(m.id);
      }
      const f = pickRandom(seafoodPool.length > 0 ? seafoodPool : meatPool, usedIds);
      if (f) {
        selected.push(f);
        usedIds.add(f.id);
      }
      const v = pickRandom(veggiePool, usedIds);
      if (v) {
        selected.push(v);
        usedIds.add(v.id);
      }
      const s = pickRandom(soupPool, usedIds);
      if (s) {
        selected.push(s);
        usedIds.add(s.id);
      }
    } else {
      const m1 = pickRandom(meatPool, usedIds);
      if (m1) {
        selected.push(m1);
        usedIds.add(m1.id);
      }
      const m2 = pickRandom(meatPool, usedIds);
      if (m2) {
        selected.push(m2);
        usedIds.add(m2.id);
      }
      const f = pickRandom(seafoodPool, usedIds);
      if (f) {
        selected.push(f);
        usedIds.add(f.id);
      }
      const v1 = pickRandom(veggiePool, usedIds);
      if (v1) {
        selected.push(v1);
        usedIds.add(v1.id);
      }
      const v2 = pickRandom(veggiePool, usedIds);
      if (v2) {
        selected.push(v2);
        usedIds.add(v2.id);
      }
      const s = pickRandom(soupPool, usedIds);
      if (s) {
        selected.push(s);
        usedIds.add(s.id);
      }
    }

    return selected.filter(Boolean);
  };

  const handleStartDraw = () => {
    setIsDrawing(true);
    setHasDrawn(false);

    setTimeout(() => {
      const combo = generateMealCombo();
      setDrawnDishes(combo);
      setIsDrawing(false);
      setHasDrawn(true);

      try {
        confetti({
          particleCount: 50,
          spread: 65,
          origin: { y: 0.6 },
          colors: ['#dc2626', '#d97706', '#10b981', '#f59e0b'],
        });
      } catch (e) {
        // ignore
      }
    }, 600);
  };

  const handleRerollSingleDish = (index: number) => {
    const target = drawnDishes[index];
    if (!target) return;

    const usedIds = new Set(drawnDishes.map((d) => d.id));
    const pool = dishes.filter((d) => d.category === target.category);
    const replacement = pickRandom(pool.length > 0 ? pool : dishes, usedIds);

    if (replacement) {
      const next = [...drawnDishes];
      next[index] = replacement;
      setDrawnDishes(next);
    }
  };

  // Full Budget & Nutrition Calculations for the drawn combo
  const totalCost = drawnDishes.reduce((sum, d) => sum + d.estimatedPrice, 0);
  const perPersonCost = Math.round((totalCost / Math.max(1, dinerPreset)) * 10) / 10;

  const totalCalories = drawnDishes.reduce((sum, d) => sum + (d.nutrition?.calories || 0), 0);
  const totalProtein = drawnDishes.reduce((sum, d) => sum + (d.nutrition?.protein || 0), 0);
  const totalCarbs = drawnDishes.reduce((sum, d) => sum + (d.nutrition?.carbs || 0), 0);
  const totalFat = drawnDishes.reduce((sum, d) => sum + (d.nutrition?.fat || 0), 0);
  const totalFiber = drawnDishes.reduce((sum, d) => sum + (d.nutrition?.fiber || 0), 0);
  const totalSodium = drawnDishes.reduce((sum, d) => sum + (d.nutrition?.sodium || 0), 0);

  const perCal = Math.round(totalCalories / Math.max(1, dinerPreset));
  const perProtein = Math.round((totalProtein / Math.max(1, dinerPreset)) * 10) / 10;
  const perCarbs = Math.round((totalCarbs / Math.max(1, dinerPreset)) * 10) / 10;
  const perFat = Math.round((totalFat / Math.max(1, dinerPreset)) * 10) / 10;

  const pCal = totalProtein * 4;
  const cCal = totalCarbs * 4;
  const fCal = totalFat * 9;
  const macroTotal = Math.max(1, pCal + cCal + fCal);
  const pPct = Math.round((pCal / macroTotal) * 100);
  const cPct = Math.round((cCal / macroTotal) * 100);
  const fPct = Math.round((fCal / macroTotal) * 100);

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Intro Header */}
      <div className="text-center px-2 space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold">
          <Dices className="w-3.5 h-3.5" />
          <span>吵麻了？盲盒决策平息餐桌争吵！</span>
        </div>
        <h2 className="font-serif-title text-xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
          随机抽一顿餐 · 预估开销与营养透视
        </h2>
        <p className="text-xs text-stone-500">
          全家选不出吃什么时，交给盲盒摇号，实时计算整顿饭的总预算与营养学供能比。
        </p>
      </div>

      {/* 空库提示 */}
      {dishes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-6 text-center">
          <Utensils className="w-7 h-7 text-stone-300 mx-auto mb-2" />
          <h4 className="font-serif-title text-sm font-bold text-stone-700 dark:text-stone-300">
            菜谱库还是空的
          </h4>
          <p className="text-xs text-stone-500 mt-1">
            先去「菜谱」录入几道菜，再回来抽签。录入的内容会实时保存到 data 目录。
          </p>
        </div>
      )}

      {/* Preset Selector Card */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 p-4 sm:p-6 shadow-sm space-y-4">
        <div>
          <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5 mb-2.5">
            <Users className="w-4 h-4 text-amber-600" />
            <span>选择就餐人口</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { count: 1, label: '1人 独享食光', desc: '1精炒 + 1素/汤' },
              { count: 2, label: '2人 甜蜜小餐', desc: '1荤 + 1素 + 1汤' },
              { count: 3, label: '3-4人 三口之家', desc: '1硬菜 + 1海鲜 + 1素 + 1汤' },
              { count: 5, label: '5人以上 阖家聚席', desc: '3硬菜 + 2素菜 + 1大汤' },
            ].map((p) => (
              <button
                key={p.count}
                onClick={() => setDinerPreset(p.count)}
                className={`p-3 rounded-xl sm:rounded-2xl text-left border transition-all active:scale-95 ${
                  dinerPreset === p.count
                    ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 shadow-sm'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-300'
                }`}
              >
                <div
                  className={`text-xs font-bold ${
                    dinerPreset === p.count ? 'text-amber-800 dark:text-amber-300' : 'text-stone-800 dark:text-stone-200'
                  }`}
                >
                  {p.label}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Big Touch Lucky Draw Button */}
        <button
          disabled={isDrawing || dishes.length === 0}
          onClick={handleStartDraw}
          className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50"
        >
          <Dices className={`w-5 h-5 ${isDrawing ? 'animate-spin' : ''}`} />
          <span>{isDrawing ? '正在洗牌摇号中...' : '🎲 吵架不如摇签 · 一键决定今天吃啥'}</span>
        </button>
      </div>

      {/* Shuffling Loading */}
      {isDrawing && (
        <div className="py-10 text-center animate-pulse">
          <Utensils className="w-8 h-8 text-amber-600 mx-auto mb-2 animate-bounce" />
          <div className="text-xs font-bold text-stone-800 dark:text-stone-200 font-serif-title">
            大厨正在盲盒签筒中抓阄...
          </div>
        </div>
      )}

      {/* Resulting Drawn Combo Display */}
      {hasDrawn && drawnDishes.length > 0 && !isDrawing && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          {/* COMPLETE ESTIMATED BUDGET & NUTRITION HEADER */}
          <div className="bg-stone-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
              <div>
                <div className="text-[10px] sm:text-xs text-amber-300 font-semibold flex items-center gap-1 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>为您摇出的黄金搭配</span>
                </div>
                <h3 className="font-serif-title text-base sm:text-xl font-bold">
                  {dinerPreset}人份 · {drawnDishes.length} 道佳肴已选定
                </h3>
              </div>

              {/* Price Tag */}
              <div className="flex items-center gap-4">
                <div className="text-left sm:text-right font-mono">
                  <span className="text-[10px] text-stone-400 block">预估总开销</span>
                  <span className="text-xl font-bold text-amber-300 tabular-nums">
                    ¥{totalCost}
                  </span>
                  <span className="text-[10px] text-stone-400 ml-1">
                    (人均约 ¥{perPersonCost})
                  </span>
                </div>
              </div>
            </div>

            {/* FULL NUTRITION BREAKDOWN FOR THIS DRAWN COMBO */}
            <div className="space-y-3">
              {/* Macro Bar */}
              <div>
                <div className="flex justify-between text-[11px] text-stone-400 font-mono mb-1">
                  <span className="text-stone-300 font-sans">整顿饭供能比</span>
                  <span>蛋白 {pPct}% · 碳水 {cPct}% · 脂肪 {fPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden flex">
                  <div style={{ width: `${pPct}%` }} className="bg-emerald-500" title={`蛋白质 ${pPct}%`} />
                  <div style={{ width: `${cPct}%` }} className="bg-amber-500" title={`碳水 ${cPct}%`} />
                  <div style={{ width: `${fPct}%` }} className="bg-rose-500" title={`脂肪 ${fPct}%`} />
                </div>
              </div>

              {/* Key Nutrients Strip */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono">
                <div className="bg-stone-800/80 p-2 rounded-xl">
                  <span className="text-[9px] text-stone-400 block font-sans">整餐总热量</span>
                  <span className="text-xs font-bold text-white tabular-nums">{totalCalories}kcal</span>
                  <span className="text-[9px] text-stone-400 block font-sans">人均{perCal}</span>
                </div>
                <div className="bg-stone-800/80 p-2 rounded-xl">
                  <span className="text-[9px] text-emerald-400 block font-sans">优质蛋白</span>
                  <span className="text-xs font-bold text-emerald-300 tabular-nums">{Math.round(totalProtein)}g</span>
                  <span className="text-[9px] text-stone-400 block font-sans">人均{perProtein}g</span>
                </div>
                <div className="bg-stone-800/80 p-2 rounded-xl">
                  <span className="text-[9px] text-amber-400 block font-sans">碳水化合物</span>
                  <span className="text-xs font-bold text-amber-300 tabular-nums">{Math.round(totalCarbs)}g</span>
                  <span className="text-[9px] text-stone-400 block font-sans">人均{perCarbs}g</span>
                </div>
                <div className="bg-stone-800/80 p-2 rounded-xl">
                  <span className="text-[9px] text-rose-400 block font-sans">优质脂肪</span>
                  <span className="text-xs font-bold text-rose-300 tabular-nums">{Math.round(totalFat)}g</span>
                  <span className="text-[9px] text-stone-400 block font-sans">人均{perFat}g</span>
                </div>
                <div className="bg-stone-800/80 p-2 rounded-xl">
                  <span className="text-[9px] text-teal-400 block font-sans">膳食纤维</span>
                  <span className="text-xs font-bold text-teal-300 tabular-nums">{Math.round(totalFiber)}g</span>
                </div>
                <div className="bg-stone-800/80 p-2 rounded-xl">
                  <span className="text-[9px] text-sky-400 block font-sans">钠盐预估</span>
                  <span className="text-xs font-bold text-sky-300 tabular-nums">{totalSodium}mg</span>
                </div>
              </div>

              <div className="text-[11px] text-stone-300 bg-stone-800/50 p-2.5 rounded-xl border border-stone-800 font-sans leading-relaxed">
                🥗 盲盒搭配评语：荤素搭配科学，整餐热量适中，蛋白质与膳食纤维充沛，是一套兼顾美味、健康与合理预算的黄金组合。
              </div>
            </div>
          </div>

          {/* TWO COLUMN GRID ON MOBILE */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4">
            {drawnDishes.map((dish, idx) => (
              <div
                key={dish.id + '-' + idx}
                className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-2.5 sm:p-3 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="relative aspect-[1/1] sm:aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 mb-2">
                    <img
                      src={dish.coverImage}
                      alt={dish.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white font-mono">
                      ¥{dish.estimatedPrice}
                    </span>
                    <span className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] text-amber-300 font-mono">
                      {dish.nutrition?.protein}g蛋白
                    </span>
                  </div>

                  <h5 className="font-serif-title font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 line-clamp-1">
                    {dish.name}
                  </h5>
                  <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                    {dish.cuisine} · {dish.nutrition?.calories}kcal
                  </div>
                </div>

                {/* Single Reroll Button (reactively recalculates budget and nutrition!) */}
                <button
                  onClick={() => handleRerollSingleDish(idx)}
                  className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800 w-full text-[10px] sm:text-xs text-stone-500 hover:text-amber-700 flex items-center justify-center gap-1 active:scale-95"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>换这道</span>
                </button>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              onClick={handleStartDraw}
              className="w-full sm:w-auto flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>整桌重摇一轮</span>
            </button>

            <button
              onClick={() => onAddCombinationToOrder(drawnDishes)}
              className="w-full sm:w-auto flex-1 py-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>一键将这套方案加入点单</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
