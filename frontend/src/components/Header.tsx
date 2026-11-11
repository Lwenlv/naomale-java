import React from 'react';
import { Flame, Dices, Activity, BarChart3, ShoppingBag, Settings2, Palette, Plus, HardDrive, Home, ChevronDown, LogOut, Users, ImagePlus } from 'lucide-react';
import type { AuthState, CustomTheme, ThemeType } from '../types';
import { THEMES } from '../utils/theme';
import type { SyncStatus } from '../services/data';
import { formatDateTime } from '../utils/date';

interface HeaderProps {
  activeTab: 'gallery' | 'order' | 'random' | 'nutrition' | 'stats';
  setActiveTab: (tab: 'gallery' | 'order' | 'random' | 'nutrition' | 'stats') => void;
  orderItemCount: number;
  currentTheme: ThemeType;
  onThemeSelect: (theme: ThemeType) => void;
  customTheme?: CustomTheme | null;
  onOpenThemeStudio: () => void;
  onOpenSettings: () => void;
  onOpenAddDish: () => void;
  syncStatus?: SyncStatus;
  lastSavedAt?: string | null;
  auth: AuthState;
  onSwitchFamily: (familyId: string) => void;
  onOpenFamily: () => void;
  onLogout: () => void;
}

const SYNC_LABEL: Record<SyncStatus, string> = {
  connecting: '连接中',
  online: '已同步',
  saving: '同步中',
  offline: '离线',
};

const SYNC_DOT: Record<SyncStatus, string> = {
  connecting: 'bg-stone-400 animate-pulse',
  online: 'bg-emerald-500',
  saving: 'bg-amber-500 animate-pulse',
  offline: 'bg-rose-500',
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  orderItemCount,
  currentTheme,
  onThemeSelect,
  customTheme,
  onOpenThemeStudio,
  onOpenSettings,
  onOpenAddDish,
  syncStatus = 'online',
  lastSavedAt,
  auth,
  onSwitchFamily,
  onOpenFamily,
  onLogout,
}) => {
  const [themeDropdownOpen, setThemeDropdownOpen] = React.useState(false);
  const [familyMenuOpen, setFamilyMenuOpen] = React.useState(false);
  const activeFamily = auth.families.find((family) => family.id === auth.activeFamilyId);
  const familyName = activeFamily?.name ?? '我的家庭';

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[var(--theme-bg)]/90 dark:bg-stone-900/90 border-b border-stone-200/80 dark:border-stone-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* 品牌区 */}
        <div
          onClick={() => setActiveTab('gallery')}
          className="cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 group active:scale-95 transition-transform"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-700 to-rose-600 flex items-center justify-center text-white shadow-sm overflow-hidden shrink-0">
            {customTheme?.slots.logo ? (
              <img src={customTheme.slots.logo} alt="主题 Logo" className="w-full h-full object-cover" />
            ) : (
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200 animate-pulse" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-serif-title text-base sm:text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                闹麻了点单
              </span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold hidden sm:inline">
                别吵了
              </span>
            </div>
          </div>
        </div>

        {/* 桌面导航 */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors relative ${
              activeTab === 'gallery'
                ? 'text-amber-800 dark:text-amber-400 font-bold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            菜谱画卷
            {activeTab === 'gallery' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-700 dark:bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('order')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'order'
                ? 'text-amber-800 dark:text-amber-400 font-bold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            家庭点单
            {orderItemCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-600 text-white">
                {orderItemCount}
              </span>
            )}
            {activeTab === 'order' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-700 dark:bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('random')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'random'
                ? 'text-amber-800 dark:text-amber-400 font-bold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            <Dices className="w-4 h-4 text-amber-600" />
            盲盒抽签
            {activeTab === 'random' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-700 dark:bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('nutrition')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'nutrition'
                ? 'text-amber-800 dark:text-amber-400 font-bold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-600" />
            营养分析
            {activeTab === 'nutrition' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-700 dark:bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'stats'
                ? 'text-amber-800 dark:text-amber-400 font-bold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-sky-600" />
            开销统计
            {activeTab === 'stats' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-700 dark:bg-amber-400 rounded-full" />
            )}
          </button>
        </nav>

        {/* 右侧操作 */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 家庭切换 */}
          <div className="relative">
            <button
              onClick={() => setFamilyMenuOpen(!familyMenuOpen)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/70 dark:bg-stone-800/80 border border-stone-200/70 dark:border-stone-700 hover:bg-white transition-colors max-w-[34px] sm:max-w-[160px]"
              title={`当前家庭：${familyName}`}
            >
              <Home className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
              <span className="hidden sm:inline text-[11px] font-semibold text-stone-700 dark:text-stone-200 truncate">{familyName}</span>
              <ChevronDown className="hidden sm:block w-3 h-3 text-stone-400 shrink-0" />
            </button>

            {familyMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFamilyMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-stone-900 shadow-xl border border-stone-200 dark:border-stone-800 py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-stone-100 dark:border-stone-800">
                    <div className="text-[10px] text-stone-400">当前账号</div>
                    <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                      {auth.user.displayName}
                      <span className="ml-1 text-[10px] font-normal text-stone-400">@{auth.user.username}</span>
                    </div>
                  </div>

                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-stone-400">我的家庭</div>
                  {auth.families.map((family) => {
                    const active = family.id === auth.activeFamilyId;
                    return (
                      <button
                        key={family.id}
                        onClick={() => {
                          setFamilyMenuOpen(false);
                          if (!active) onSwitchFamily(family.id);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-xs transition-colors ${
                          active
                            ? 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold'
                            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                      >
                        <span className="truncate">{family.name}</span>
                        <span className="text-[10px] text-stone-400 shrink-0">
                          {family.role === 'owner' ? '主' : '成员'}
                        </span>
                      </button>
                    );
                  })}

                  <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
                  <button
                    onClick={() => {
                      setFamilyMenuOpen(false);
                      onOpenFamily();
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    家庭管理 / 邀请家人
                  </button>
                  <button
                    onClick={() => {
                      setFamilyMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    退出登录
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={onOpenAddDish}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 text-xs font-semibold text-stone-700 dark:text-stone-200 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-xl transition-all active:scale-95"
            title="录入菜谱"
          >
            <Plus className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span className="hidden sm:inline">录菜</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors active:scale-95"
              title="主题与设置"
            >
              <Palette className="w-4 h-4" />
            </button>

            {themeDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setThemeDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-stone-900 shadow-xl border border-stone-200 dark:border-stone-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                    主题画卷
                  </div>
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        onThemeSelect(theme.id);
                        setThemeDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                        currentTheme === theme.id
                          ? 'font-bold text-amber-800 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/40'
                          : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
                          style={{ backgroundColor: theme.colorPreview }}
                        />
                        <div>
                          <div>{theme.name}</div>
                          <div className="text-[10px] text-stone-400">{theme.subtitle}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {customTheme && (
                    <button
                      onClick={() => {
                        onThemeSelect('custom');
                        setThemeDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                        currentTheme === 'custom'
                          ? 'font-bold text-amber-800 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/40'
                          : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
                          style={{ backgroundColor: customTheme.palette.primary }}
                        />
                        <div>
                          <div>{customTheme.name || '自定义主题'}</div>
                          <div className="text-[10px] text-stone-400">我的主题包</div>
                        </div>
                      </div>
                    </button>
                  )}
                  <div className="mt-1 pt-1 border-t border-stone-100 dark:border-stone-800">
                    <button
                      onClick={() => {
                        setThemeDropdownOpen(false);
                        onOpenThemeStudio();
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      主题工坊 · 上传图片
                    </button>
                    <button
                      onClick={() => {
                        setThemeDropdownOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      系统设置
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setActiveTab('order')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 rounded-xl transition-all shadow-sm active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>点单</span>
            {orderItemCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-white/20 font-mono">
                {orderItemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
