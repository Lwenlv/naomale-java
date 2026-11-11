import React from 'react';
import { UtensilsCrossed, ShoppingBag, Dices, Activity, BarChart3 } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: 'gallery' | 'order' | 'random' | 'nutrition' | 'stats';
  setActiveTab: (tab: 'gallery' | 'order' | 'random' | 'nutrition' | 'stats') => void;
  orderItemCount: number;
  navIcons?: Partial<Record<'gallery' | 'order' | 'random' | 'nutrition' | 'stats', string>>;
}

interface TabItem {
  id: 'gallery' | 'order' | 'random' | 'nutrition' | 'stats';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  highlight?: boolean;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  setActiveTab,
  orderItemCount,
  navIcons,
}) => {
  const tabs: TabItem[] = [
    { id: 'gallery', label: '菜谱', icon: UtensilsCrossed },
    { id: 'order', label: '点单', icon: ShoppingBag, badge: orderItemCount },
    { id: 'random', label: '抽签', icon: Dices, highlight: true },
    { id: 'nutrition', label: '营养分析', icon: Activity },
    { id: 'stats', label: '账本', icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--theme-bg)]/95 dark:bg-stone-900/95 backdrop-blur-lg border-t border-stone-200/80 dark:border-stone-800 md:hidden safe-area-bottom">
      <div className="grid grid-cols-5 h-15 max-w-lg mx-auto items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const iconUrl = navIcons?.[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="relative flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-all active:scale-95"
            >
              <div
                className={`relative flex items-center justify-center rounded-full transition-all ${
                  iconUrl
                    ? `w-7 h-7 ${isActive ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-[var(--theme-bg)] dark:ring-offset-stone-900' : 'opacity-70'}`
                    : ''
                }`}
              >
                {iconUrl ? (
                  <img src={iconUrl} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive
                        ? 'text-amber-700 dark:text-amber-400 stroke-[2.2]'
                        : 'text-stone-400 dark:text-stone-500'
                    }`}
                  />
                )}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 min-w-[16px] h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold font-mono flex items-center justify-center leading-none">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 transition-colors ${
                  isActive
                    ? 'font-bold text-amber-800 dark:text-amber-300'
                    : 'text-stone-500 dark:text-stone-400 font-medium'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute top-0 w-6 h-0.5 bg-amber-700 dark:bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
