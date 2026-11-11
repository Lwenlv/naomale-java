import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

import { Header } from './components/Header';
import { BottomTabBar } from './components/BottomTabBar';
import { DishGallery } from './components/DishGallery';
import { FamilyOrderView } from './components/FamilyOrderView';
import { RandomDecisionView } from './components/RandomDecisionView';
import { NutritionView } from './components/NutritionView';
import { StatisticsView } from './components/StatisticsView';
import { DishDetailModal } from './components/DishDetailModal';
import { AddDishModal } from './components/AddDishModal';
import { SettingsModal } from './components/SettingsModal';
import { OrderDetailModal } from './components/OrderDetailModal';
import { AuthScreen } from './components/AuthScreen';
import { FamilyModal } from './components/FamilyModal';
import { ThemeStudio } from './components/ThemeStudio';

import type { BootstrapPayload, ColorPalette, Dish, MealOrder, OrderItem, ThemeStyle } from './types';
import {
  archiveCurrentOrder,
  AuthRequiredError,
  clearCurrentOrder,
  deleteDish,
  deleteHistoryOrder,
  getState,
  getSyncStatus,
  initData,
  logoutAccount,
  onError,
  onSyncStatus,
  reorderHistory,
  saveDish,
  subscribe,
  switchFamily,
  toggleDishFavorite,
  updateCurrentOrder,
  type SyncStatus,
} from './services/data';
import { applyTheme, parseTheme } from './utils/theme';
import { formatDateTime } from './utils/date';

type TabId = 'gallery' | 'order' | 'random' | 'nutrition' | 'stats';

const NAOMALE_NAV_ICONS = {
  gallery: '/images/theme-naomale/nav-gallery.png',
  order: '/images/theme-naomale/nav-order.png',
  random: '/images/theme-naomale/nav-random.png',
  nutrition: '/images/theme-naomale/nav-nutrition.png',
  stats: '/images/theme-naomale/nav-stats.png',
};

const NAOMALE_HERO_IMAGE = '/images/theme-naomale/hero-home.png';

const newId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export default function App() {
  const [state, setState] = React.useState<BootstrapPayload | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [authRequired, setAuthRequired] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabId>('gallery');
  const [themeStyle, setThemeStyle] = React.useState<ThemeStyle>('naomale');
  const [colorPalette, setColorPalette] = React.useState<ColorPalette>('naomale');
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>(getSyncStatus());
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // 弹窗状态
  const [detailDish, setDetailDish] = React.useState<Dish | null>(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = React.useState<MealOrder | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingDish, setEditingDish] = React.useState<Dish | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isFamilyOpen, setIsFamilyOpen] = React.useState(false);
  const [isThemeStudioOpen, setIsThemeStudioOpen] = React.useState(false);

  const toastTimer = React.useRef<number | null>(null);

  const showToast = React.useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 2800);
  }, []);

  const loadAll = React.useCallback(async () => {
    setLoadError(null);
    try {
      const data = await initData();
      setState(data);
      setAuthRequired(false);
      const selection = parseTheme(data.settings.theme);
      setThemeStyle(selection.style);
      setColorPalette(selection.palette);
      applyTheme(selection, { custom: data.settings.customTheme, persist: false });
      if (data.meta.warnings.length > 0) {
        showToast(`⚠️ ${data.meta.warnings[0]}`);
      }
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setAuthRequired(true);
        setLoadError(null);
        return;
      }
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }, [showToast]);

  React.useEffect(() => {
    const unsubscribe = subscribe((next) => {
      setState(next);
      if (next) setAuthRequired(false);
    });
    const unsubscribeStatus = onSyncStatus((status) => setSyncStatus(status));
    const offError = onError((message) => showToast(`⚠️ ${message}`));
    void loadAll();

    return () => {
      unsubscribe();
      unsubscribeStatus();
      offError();
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [loadAll, showToast]);

  // 其他设备/主题工坊更新主题后，当前页面立即换肤
  const activeTheme = state?.settings.theme;
  const customTheme = state?.settings.customTheme;
  React.useEffect(() => {
    if (!activeTheme) return;
    const selection = parseTheme(activeTheme);
    setThemeStyle(selection.style);
    setColorPalette(selection.palette);
    applyTheme(selection, { custom: customTheme, persist: false });
  }, [activeTheme, customTheme]);

  /* ------------------------------ 数据操作 ------------------------------ */

  const applyThemeSelection = (nextStyle: ThemeStyle, nextPalette: ColorPalette) => {
    setThemeStyle(nextStyle);
    setColorPalette(nextPalette);
    applyTheme({ style: nextStyle, palette: nextPalette }, { custom: getState().settings.customTheme });
  };

  const handleStyleSelect = (style: ThemeStyle) => {
    if (style === 'custom' && !getState().settings.customTheme) {
      setIsThemeStudioOpen(true);
      return;
    }
    applyThemeSelection(style, colorPalette);
  };

  const handlePaletteSelect = (palette: ColorPalette) => {
    if (themeStyle === 'custom') return;
    applyThemeSelection('naomale', palette);
  };

  const handleQuickAdd = (dish: Dish, memberName: string = '全家') => {
    const current = getState().currentOrder;
    const items: OrderItem[] = current.items.map((item) => ({ ...item }));
    const index = items.findIndex((item) => item.dishId === dish.id && item.member === memberName);

    if (index >= 0) {
      items[index] = { ...items[index], quantity: items[index].quantity + 1 };
    } else {
      items.push({
        id: newId('oi'),
        dishId: dish.id,
        dish,
        quantity: 1,
        member: memberName,
        notes: '',
        customPrice: dish.estimatedPrice,
      });
    }

    updateCurrentOrder({ ...current, items });
    showToast(`➕ 已点「${dish.name}」（${memberName}）`);
  };

  const handleAddCombinationToOrder = (comboDishes: Dish[]) => {
    const current = getState().currentOrder;
    const items: OrderItem[] = current.items.map((item) => ({ ...item }));

    for (const dish of comboDishes) {
      const existing = items.find((item) => item.dishId === dish.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        items.push({
          id: newId('oi'),
          dishId: dish.id,
          dish,
          quantity: 1,
          member: '全家',
          notes: '',
          customPrice: dish.estimatedPrice,
        });
      }
    }

    updateCurrentOrder({ ...current, items });
    setActiveTab('order');
    showToast(`🎉 盲盒方案 ${comboDishes.length} 道菜已入单！`);
  };

  const handleSaveDish = async (dish: Dish) => {
    try {
      const exists = getState().dishes.some((item) => item.id === dish.id);
      await saveDish(dish);
      showToast(exists ? `「${dish.name}」已更新并保存！` : `🎉「${dish.name}」录入成功！`);
    } catch (error) {
      showToast(`保存失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDeleteDish = async (dish: Dish) => {
    if (!window.confirm(`确认删除菜谱「${dish.name}」吗？\n历史账单中的此菜会保留快照。`)) return;
    try {
      await deleteDish(dish.id);
      setDetailDish(null);
      showToast(`已删除「${dish.name}」`);
    } catch (error) {
      showToast(`删除失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleToggleFavorite = async (dishId: string) => {
    const target = getState().dishes.find((dish) => dish.id === dishId);
    if (!target) return;
    try {
      const next = await toggleDishFavorite(dishId, !target.isFavorite);
      showToast(next.isFavorite ? `❤️ 已收藏「${next.name}」` : `已取消收藏「${next.name}」`);
    } catch (error) {
      showToast(`操作失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleArchiveOrder = async (actualCost?: number) => {
    try {
      await archiveCurrentOrder(actualCost);
      setActiveTab('stats');
      showToast('🍽️ 本餐已开饭归档，账本与累计次数已更新！');
    } catch (error) {
      showToast(`归档失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleReorder = async (order: MealOrder) => {
    try {
      await reorderHistory(order.id);
      setActiveTab('order');
      showToast(`🔄 已把「${order.title}」载入今日点单`);
    } catch (error) {
      showToast(`载入失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDeleteHistoryOrder = async (orderId: string) => {
    try {
      await deleteHistoryOrder(orderId);
      showToast('已删除该笔就餐历史');
    } catch (error) {
      showToast(`删除失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleClearOrder = async () => {
    if (!window.confirm('确认清空当前点单？')) return;
    try {
      await clearCurrentOrder();
      showToast('点单已清空');
    } catch (error) {
      showToast(`清空失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSwitchFamily = async (familyId: string) => {
    try {
      const next = await switchFamily(familyId);
      setState(next);
      setActiveTab('gallery');
      setDetailDish(null);
      setSelectedOrderForDetail(null);
      setEditingDish(null);
      setIsAddModalOpen(false);
      const name = next.auth.families.find((family) => family.id === familyId)?.name ?? '家庭';
      showToast(`已切换到「${name}」`);
    } catch (error) {
      showToast(`切换家庭失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('确认退出登录？数据不会被删除。')) return;
    try {
      await logoutAccount();
      setAuthRequired(true);
      setState(null);
      setActiveTab('gallery');
      setIsSettingsOpen(false);
      setIsFamilyOpen(false);
      setIsAddModalOpen(false);
      setDetailDish(null);
      setSelectedOrderForDetail(null);
    } catch (error) {
      showToast(`退出失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  /* ------------------------------ 加载 / 失败 ------------------------------ */

  if (!state) {
    if (authRequired) return <AuthScreen />;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff7f7] px-4">
        <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex min-h-16 items-center justify-center">
            {loadError ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-700 to-rose-600 text-white shadow-sm">
                <AlertTriangle className="h-7 w-7" />
              </div>
            ) : (
              <img
                src="/images/logo-naomale.png"
                alt="闹麻了点单"
                className="h-16 w-auto object-contain"
              />
            )}
          </div>
          <h1 className={`font-serif-title text-xl font-bold text-stone-900 ${loadError ? '' : 'sr-only'}`}>
            闹麻了点单
          </h1>
          <p className="mt-1 text-xs text-stone-500">家庭餐桌管家 · 多设备实时同步</p>

          {loadError ? (
            <div className="mt-5 space-y-3 text-left">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700">
                暂时无法加载数据：{loadError}
              </div>
              <div className="text-[11px] leading-relaxed text-stone-500">
                服务暂时不可用，请稍后刷新重试。
              </div>
              <button
                type="button"
                onClick={() => void loadAll()}
                className="w-full rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-800 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                重新加载
              </button>
            </div>
          ) : (
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
              正在准备今天的菜单…
            </div>
          )}
        </div>
      </div>
    );
  }

  const totalItemCount = state.currentOrder.items.reduce((sum, item) => sum + item.quantity, 0);
  const lastSavedLabel = state.meta.lastSavedAt ? formatDateTime(state.meta.lastSavedAt) : '尚未保存';

  return (
    <div className="app-shell min-h-screen flex flex-col bg-[var(--theme-bg)] text-stone-900 dark:text-stone-100 font-sans-body transition-colors">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        orderItemCount={totalItemCount}
        currentStyle={themeStyle}
        currentPalette={colorPalette}
        onStyleSelect={handleStyleSelect}
        onPaletteSelect={handlePaletteSelect}
        customTheme={customTheme}
        onOpenThemeStudio={() => setIsThemeStudioOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAddDish={() => {
          setEditingDish(null);
          setIsAddModalOpen(true);
        }}
        syncStatus={syncStatus}
        lastSavedAt={state.meta.lastSavedAt}
        auth={state.auth}
        onSwitchFamily={(familyId) => void handleSwitchFamily(familyId)}
        onOpenFamily={() => setIsFamilyOpen(true)}
        onLogout={() => void handleLogout()}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-20 md:pb-12">
        {activeTab === 'gallery' && (
          <DishGallery
            dishes={state.dishes}
            onViewDetail={(dish) => setDetailDish(dish)}
            onQuickAdd={handleQuickAdd}
            onToggleFavorite={handleToggleFavorite}
            onOpenAddDish={() => {
              setEditingDish(null);
              setIsAddModalOpen(true);
            }}
            onStartRandomDraw={() => setActiveTab('random')}
            members={state.members}
            heroImage={
              themeStyle === 'custom'
                ? customTheme?.slots.hero || customTheme?.slots.background
                : NAOMALE_HERO_IMAGE
            }
            heroFit={themeStyle === 'naomale' ? 'natural' : 'cover'}
          />
        )}

        {activeTab === 'order' && (
          <FamilyOrderView
            currentOrder={state.currentOrder}
            ordersHistory={state.ordersHistory}
            onUpdateOrder={(order) => updateCurrentOrder(order)}
            onArchiveOrder={handleArchiveOrder}
            onClearOrder={() => void handleClearOrder()}
            onNavigateToGallery={() => setActiveTab('gallery')}
            onReorder={(order) => void handleReorder(order)}
            onDeleteHistoryOrder={(orderId) => void handleDeleteHistoryOrder(orderId)}
            onViewOrderDetail={(order) => setSelectedOrderForDetail(order)}
            members={state.members}
          />
        )}

        {activeTab === 'random' && (
          <RandomDecisionView dishes={state.dishes} onAddCombinationToOrder={handleAddCombinationToOrder} />
        )}

        {activeTab === 'nutrition' && (
          <NutritionView
            currentOrder={state.currentOrder}
            allDishes={state.dishes}
            onNavigateToOrder={() => setActiveTab('order')}
          />
        )}

        {activeTab === 'stats' && (
          <StatisticsView
            ordersHistory={state.ordersHistory}
            allDishes={state.dishes}
            onViewOrderDetail={(order) => setSelectedOrderForDetail(order)}
          />
        )}
      </main>

      <BottomTabBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        orderItemCount={totalItemCount}
        navIcons={
          themeStyle === 'naomale'
            ? NAOMALE_NAV_ICONS
            : customTheme
              ? {
                  gallery: customTheme.slots.navGallery,
                  order: customTheme.slots.navOrder,
                  random: customTheme.slots.navRandom,
                  nutrition: customTheme.slots.navNutrition,
                  stats: customTheme.slots.navStats,
                }
              : undefined
        }
      />

      <footer className="hidden md:block mt-auto border-t border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50 py-4 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/images/logo-naomale.png" alt="闹麻了点单" className="h-5 w-auto object-contain" />
            <span>·</span>
            <span>今天吃啥别吵了 · 多设备实时同步</span>
            <span className="hidden lg:inline text-stone-400">|</span>
            <span className="hidden lg:inline font-mono text-[11px] text-stone-400">
              最后保存 {lastSavedLabel}
            </span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="hover:text-amber-700 underline text-[11px] shrink-0"
          >
            系统设置 / AI 配置
          </button>
        </div>
      </footer>

      <DishDetailModal
        dish={detailDish}
        onClose={() => setDetailDish(null)}
        onAddToOrder={(dish, member) => handleQuickAdd(dish, member)}
        onToggleFavorite={(dishId) => void handleToggleFavorite(dishId)}
        onEditDish={(dish) => {
          setDetailDish(null);
          setEditingDish(dish);
          setIsAddModalOpen(true);
        }}
        onDeleteDish={(dish) => void handleDeleteDish(dish)}
        members={state.members}
      />

      {isAddModalOpen && (
        <AddDishModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingDish(null);
          }}
          onSaveDish={(dish) => void handleSaveDish(dish)}
          editingDish={editingDish}
          hasAIKey={state.settings.ai.hasKey}
          aiModel={state.settings.ai.model}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={state.settings}
        meta={state.meta}
        onNotify={showToast}
        onOpenThemeStudio={() => {
          setIsSettingsOpen(false);
          setIsThemeStudioOpen(true);
        }}
      />

      <FamilyModal
        isOpen={isFamilyOpen}
        auth={state.auth}
        onClose={() => setIsFamilyOpen(false)}
        onNotify={showToast}
      />

      <ThemeStudio
        isOpen={isThemeStudioOpen}
        onClose={() => setIsThemeStudioOpen(false)}
        customTheme={customTheme}
        onNotify={showToast}
      />

      <OrderDetailModal
        order={selectedOrderForDetail}
        onClose={() => setSelectedOrderForDetail(null)}
        onReorder={(order) => void handleReorder(order)}
        onDeleteOrder={(orderId) => void handleDeleteHistoryOrder(orderId)}
      />

      {toastMessage && (
        <div className="fixed left-1/2 -translate-x-1/2 z-50 bottom-24 sm:bottom-auto sm:top-4 bg-stone-900/95 dark:bg-stone-100/95 text-white dark:text-stone-900 px-4 py-2 rounded-2xl shadow-xl backdrop-blur-md text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-150 max-w-[92vw]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span className="break-words">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
