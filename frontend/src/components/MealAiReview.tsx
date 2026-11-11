import React from 'react';
import { AlertCircle, Loader2, Sparkles, Utensils } from 'lucide-react';
import type { OrderItem } from '../types';
import { generateAINutritionAdvice, sumNutrition } from '../services/ai';
import { getSettings } from '../services/data';

interface MealAiReviewProps {
  items: OrderItem[];
  dinerCount: number;
  compact?: boolean;
}

const round = (value: number): number => Math.round(value * 10) / 10;

export const MealAiReview: React.FC<MealAiReviewProps> = ({ items, dinerCount, compact = false }) => {
  const [advice, setAdvice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const lastAutoSignature = React.useRef('');
  const hasAIKey = Boolean(getSettings()?.ai.hasKey);
  const diners = Math.max(1, dinerCount);
  const totals = React.useMemo(() => sumNutrition(items), [items]);
  const per = (key: keyof typeof totals): number => (totals[key] ?? 0) / diners;

  const flags = React.useMemo(() => {
    if (items.length === 0) return [];
    const result: Array<{ label: string; tone: 'warn' | 'ok' }> = [];
    const vegetableCount = items.filter(
      (item) => item.dish.category === 'veggie' || item.dish.category === 'fruit'
    ).length;

    if (per('protein') < 20) result.push({ label: '蛋白质可能偏少', tone: 'warn' });
    if (vegetableCount === 0) result.push({ label: '缺少蔬菜或水果', tone: 'warn' });
    if (per('fiber') < 5) result.push({ label: '膳食纤维偏少', tone: 'warn' });
    if (per('vitaminC') < 30) result.push({ label: '维生素 C 偏少', tone: 'warn' });
    if (per('calcium') < 200) result.push({ label: '钙偏少', tone: 'warn' });
    if (per('sodium') > 800) result.push({ label: '钠偏高', tone: 'warn' });
    if (result.length === 0) result.push({ label: '结构相对均衡', tone: 'ok' });
    return result;
  }, [items, totals, diners]);

  const analyze = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateAINutritionAdvice(items, diners);
      setAdvice(result);
    } catch (adviceError) {
      setError(adviceError instanceof Error ? adviceError.message : String(adviceError));
    } finally {
      setLoading(false);
    }
  };

  // 点单变化后自动做一次本单分析；手动按钮可随时重算。
  const signature = items.map((item) => `${item.dishId}:${item.quantity}`).join('|') + `:${diners}`;
  React.useEffect(() => {
    if (!hasAIKey || items.length === 0 || signature === lastAutoSignature.current) return;
    const timer = window.setTimeout(() => {
      lastAutoSignature.current = signature;
      void analyze();
    }, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, hasAIKey, items.length]);

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-emerald-200/70 dark:border-stone-800 p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="font-serif-title font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
              AI 本单膳食点评
            </h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40">
              基于当前点单
            </span>
          </div>
          <p className="text-[10px] text-stone-400 mt-0.5">
            数据来源：当前点单的菜品、数量、就餐人数；AI 会结合热量、蛋白质、纤维、糖、维生素和矿物质给出建议。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void analyze()}
          disabled={loading || items.length === 0}
          className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? '分析中…' : advice ? '重新分析' : hasAIKey ? 'AI 分析本单' : '生成膳食点评'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-xs text-stone-400 py-3 flex items-center gap-2">
          <Utensils className="w-4 h-4" />
          当前点单还是空的，先点几道菜再分析。
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {flags.map((flag) => (
              <span
                key={flag.label}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  flag.tone === 'warn'
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/40'
                }`}
              >
                {flag.label}
              </span>
            ))}
          </div>

          {advice && (
            <div className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3 border border-stone-200/70 dark:border-stone-700">
              {advice}
            </div>
          )}

          {error && (
            <div className="text-xs text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}

          {!advice && !loading && (
            <p className="text-[11px] text-stone-400">
              {hasAIKey
                ? '点击右上角，AI 会针对这桌菜给出“可能缺什么、建议补什么”的点评。'
                : '当前未配置 AI，会使用基础营养规则给出建议；配置 DeepSeek 后可获得更具体的膳食点评。'}
            </p>
          )}
        </>
      )}
    </div>
  );
};
