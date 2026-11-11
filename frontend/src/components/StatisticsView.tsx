import React from 'react';
import { TrendingUp, Award } from 'lucide-react';
import type { MealOrder, Dish } from '../types';
import { addDays, localDateString, weekdayOf } from '../utils/date';

interface StatisticsViewProps {
  ordersHistory: MealOrder[];
  allDishes: Dish[];
  onViewOrderDetail?: (order: MealOrder) => void;
}

const RANGE_DAYS: Record<'day' | 'week' | 'month', number> = { day: 0, week: 6, month: 29 };
type TimeRange = 'day' | 'week' | 'month' | 'custom';

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  ordersHistory,
  allDishes,
  onViewOrderDetail,
}) => {
  const [timeRange, setTimeRange] = React.useState<TimeRange>('week');
  const today = localDateString();
  const [rangeStart, setRangeStart] = React.useState(addDays(today, -RANGE_DAYS.week));
  const [rangeEnd, setRangeEnd] = React.useState(today);

  const selectPreset = (mode: 'day' | 'week' | 'month') => {
    setTimeRange(mode);
    setRangeStart(addDays(today, -RANGE_DAYS[mode]));
    setRangeEnd(today);
  };

  const startDate = timeRange === 'custom' ? rangeStart : addDays(today, -RANGE_DAYS[timeRange]);
  const endDate = timeRange === 'custom' ? rangeEnd : today;

  // 按本地日期字符串比较，避免 Date 解析 UTC 造成的跨日误差
  const filteredOrders = React.useMemo(() => {
    return ordersHistory.filter((order) => order.date >= startDate && order.date <= endDate);
  }, [ordersHistory, startDate, endDate]);

  // 汇总统计
  const totalExpense = filteredOrders.reduce(
    (sum, order) => sum + (order.actualCost ?? order.totalEstimatedCost ?? 0),
    0
  );
  const totalMeals = filteredOrders.length;
  const avgCostPerMeal = totalMeals > 0 ? Math.round((totalExpense / totalMeals) * 10) / 10 : 0;
  const totalDiners = filteredOrders.reduce((sum, order) => sum + (order.dinerCount || 1), 0);
  const avgCostPerPerson = totalDiners > 0 ? Math.round((totalExpense / totalDiners) * 10) / 10 : 0;

  // 区间内最常点的菜
  const topDishes = React.useMemo(() => {
    const counts = new Map<string, { dish: Dish; count: number }>();
    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const dish = allDishes.find((entry) => entry.id === item.dishId) ?? item.dish;
        const current = counts.get(item.dishId);
        if (current) {
          current.count += item.quantity;
        } else {
          counts.set(item.dishId, { dish, count: item.quantity });
        }
      });
    });
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredOrders, allDishes]);

  // 近 7 天开销走势
  const last7DaysData = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const dateStr = addDays(today, index - 6);
      const cost = ordersHistory
        .filter((order) => order.date === dateStr)
        .reduce((sum, order) => sum + (order.actualCost ?? order.totalEstimatedCost ?? 0), 0);
      return { dateStr, label: weekdayOf(dateStr), cost };
    });
  }, [ordersHistory, today]);

  const maxDailyCost = Math.max(120, ...last7DaysData.map((day) => day.cost));

  return (
    <div className="space-y-4 sm:space-y-6 pb-24">
      {/* Header and Filter */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-widest block mb-0.5">
            家庭账本 · 餐饮开支
          </span>
          <h2 className="font-serif-title text-lg sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
            饮食开销与生活统计
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            按时间区间查看家庭伙食成本与偏好
          </p>
        </div>

        {/* Time range switch */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl self-start sm:self-auto">
          {([
            ['day', '本日'],
            ['week', '本周'],
            ['month', '本月'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => selectPreset(mode)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                timeRange === mode
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm font-bold'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 shrink-0">统计区间</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={rangeStart}
            max={rangeEnd || today}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) return;
              setTimeRange('custom');
              setRangeStart(value);
              if (value > rangeEnd) setRangeEnd(value);
            }}
            className="text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2.5 py-1.5 text-stone-800 dark:text-stone-200"
          />
          <span className="text-xs text-stone-400">至</span>
          <input
            type="date"
            value={rangeEnd}
            min={rangeStart}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) return;
              setTimeRange('custom');
              setRangeEnd(value);
              if (value < rangeStart) setRangeStart(value);
            }}
            className="text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2.5 py-1.5 text-stone-800 dark:text-stone-200"
          />
        </div>
        <button
          type="button"
          onClick={() => setTimeRange('custom')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            timeRange === 'custom'
              ? 'bg-amber-700 text-white'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
        >
          按区间统计
        </button>
        <span className="text-[11px] text-stone-400 sm:ml-auto">
          共 {filteredOrders.length} 笔 · {startDate} 至 {endDate}
        </span>
      </div>

      {/* KPI 4-Card Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-[11px] text-stone-500 mb-0.5">伙食总支出</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700 dark:text-amber-400 tabular-nums">
            ¥{totalExpense}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>平稳合理</span>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-[11px] text-stone-500 mb-0.5">平均每餐开销</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-stone-800 dark:text-stone-100 tabular-nums">
            ¥{avgCostPerMeal}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            共计就餐 {totalMeals} 次
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-[11px] text-stone-500 mb-0.5">人均单餐支出</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-stone-800 dark:text-stone-100 tabular-nums">
            ¥{avgCostPerPerson}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            服务 {totalDiners} 人次
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-[11px] text-stone-500 mb-0.5">菜谱利用率</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {Math.round((allDishes.filter((d) => d.cookCount > 0).length / Math.max(1, allDishes.length)) * 100)}%
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            收录 {allDishes.length} 道菜
          </div>
        </div>
      </div>

      {/* Two Column Layout: Weekly Trend Bar Chart & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: 7-Day Expense Trend Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <h3 className="font-serif-title font-bold text-lg text-stone-900 dark:text-stone-100">
              近 7 日家庭伙食开销走势
            </h3>
            <span className="text-xs text-stone-400 font-mono">单位：元 (RMB)</span>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2">
            {last7DaysData.map((d, i) => {
              const heightPct = Math.max(8, Math.round((d.cost / maxDailyCost) * 100));
              const isToday = i === 6;
              return (
                <div key={d.dateStr} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[11px] font-mono text-stone-500 group-hover:text-amber-700 dark:group-hover:text-amber-400 font-bold tabular-nums">
                    {d.cost > 0 ? `¥${d.cost}` : '-'}
                  </span>
                  <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-xl h-36 flex items-end overflow-hidden p-1">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-lg transition-all duration-500 ${
                        isToday
                          ? 'bg-amber-600 dark:bg-amber-500'
                          : d.cost > 0
                          ? 'bg-amber-700/60 hover:bg-amber-700'
                          : 'bg-transparent'
                      }`}
                    />
                  </div>
                  <span className={`text-xs ${isToday ? 'font-bold text-amber-800 dark:text-amber-400' : 'text-stone-500'}`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-stone-100 dark:border-stone-800">
            <span>柱状图展示每日家庭买菜真实发生或预估账单</span>
            <span className="font-mono">最高单日：¥{Math.round(maxDailyCost)}</span>
          </div>
        </div>

        {/* Right: Most Cooked Leaderboard Top 5 */}
        <div className="lg:col-span-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <h3 className="font-serif-title font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              <span>全家最爱吃的招牌菜 Top 5</span>
            </h3>
          </div>

          <div className="space-y-3">
            {topDishes.length === 0 && (
              <div className="py-10 text-center text-xs text-stone-400">当前区间还没有点单记录</div>
            )}
            {topDishes.map(({ dish, count }, idx) => (
              <div
                key={dish.id}
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950 shadow-sm'
                        : idx === 1
                        ? 'bg-stone-300 text-stone-800'
                        : idx === 2
                        ? 'bg-amber-700/40 text-amber-900 dark:text-amber-200'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <img
                    src={dish.coverImage}
                    alt={dish.name}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-xl object-cover bg-stone-100"
                  />
                  <div>
                    <h5 className="font-serif-title font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                      {dish.name}
                    </h5>
                    <span className="text-[11px] text-stone-400 font-sans-body">
                      {dish.cuisine} · ¥{dish.estimatedPrice}/份
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-400 tabular-nums block">
                    区间点单 {count} 份
                  </span>
                  <span className="text-[10px] text-stone-400">
                    约贡献 ¥{count * dish.estimatedPrice}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historical Orders Journal Table */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <h3 className="font-serif-title font-bold text-lg text-stone-900 dark:text-stone-100">
            区间账单明细 ({filteredOrders.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800 text-stone-400">
                <th className="py-2.5 font-medium">就餐日期与餐名</th>
                <th className="py-2.5 font-medium">餐别</th>
                <th className="py-2.5 font-medium">就餐人数</th>
                <th className="py-2.5 font-medium">包含菜品</th>
                <th className="py-2.5 font-medium">主厨</th>
                <th className="py-2.5 font-medium text-right">支出金额</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-mono">
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400 font-sans">
                    当前区间没有账单。可以切换本日/本周/本月，或调整起止日期。
                  </td>
                </tr>
              )}
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => onViewOrderDetail?.(order)}
                  className="hover:bg-amber-50/50 dark:hover:bg-stone-800/50 transition-colors cursor-pointer"
                  title="点击查看此订单与营养详情"
                >
                  <td className="py-3 font-sans">
                    <span className="font-semibold text-stone-900 dark:text-stone-100 block">{order.title}</span>
                    <span className="text-[11px] text-stone-400">{order.date}</span>
                  </td>
                  <td className="py-3 font-sans text-stone-600 dark:text-stone-300">
                    {order.mealType === 'breakfast'
                      ? '早餐'
                      : order.mealType === 'lunch'
                      ? '午餐'
                      : order.mealType === 'dinner'
                      ? '晚餐'
                      : '夜宵'}
                  </td>
                  <td className="py-3 text-stone-600 dark:text-stone-300 tabular-nums">
                    {order.dinerCount} 人
                  </td>
                  <td className="py-3 font-sans text-stone-700 dark:text-stone-200 max-w-xs truncate">
                    {order.items.map((i) => i.dish.name).join('、')}
                  </td>
                  <td className="py-3 font-sans text-stone-500">{order.chef || '家人'}</td>
                  <td className="py-3 text-right font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                    ¥{order.actualCost ?? order.totalEstimatedCost}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
