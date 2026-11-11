import type { CustomTheme, ThemeType } from '../types';
import { saveTheme } from '../services/data';

export interface ThemeConfig {
  id: Exclude<ThemeType, 'custom'>;
  name: string;
  subtitle: string;
  colorPreview: string;
  isDark: boolean;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'spice',
    name: '闹腾烟火',
    subtitle: '热辣生香，川湘热炒大锅气',
    colorPreview: '#dc2626',
    isDark: false,
  },
  {
    id: 'wood',
    name: '和解原木',
    subtitle: '陶土素雅，温润抚平七嘴八舌',
    colorPreview: '#d97706',
    isDark: false,
  },
  {
    id: 'sage',
    name: '别吵了绿',
    subtitle: '清爽薄荷，给餐桌来点冷静',
    colorPreview: '#059669',
    isDark: false,
  },
  {
    id: 'midnight',
    name: '夜宵排档',
    subtitle: '黑金石板，越夜越闹腾的微醺',
    colorPreview: '#f59e0b',
    isDark: true,
  },
];

const CUSTOM_VARS = [
  '--theme-bg', '--theme-card', '--theme-nav', '--theme-text', '--theme-muted',
  '--theme-primary', '--theme-primary-hover', '--theme-primary-light', '--theme-primary-dark',
  '--theme-border', '--theme-wallpaper',
  '--color-amber-50', '--color-amber-100', '--color-amber-200', '--color-amber-300',
  '--color-amber-400', '--color-amber-500', '--color-amber-600', '--color-amber-700',
  '--color-amber-800', '--color-amber-900', '--color-amber-950',
  '--color-rose-50', '--color-rose-100', '--color-rose-200', '--color-rose-300',
  '--color-rose-400', '--color-rose-500', '--color-rose-600', '--color-rose-700',
  '--color-rose-800', '--color-rose-900', '--color-rose-950',
];

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}

function mix(color: string, target: string, ratio: number): string {
  const a = hexToRgb(color);
  const b = hexToRgb(target);
  return toHex([
    a[0] * (1 - ratio) + b[0] * ratio,
    a[1] * (1 - ratio) + b[1] * ratio,
    a[2] * (1 - ratio) + b[2] * ratio,
  ]);
}

function setScale(root: HTMLElement, prefix: 'amber' | 'rose', primary: string): void {
  const dark = mix(primary, '#000000', 0.28);
  const values: Record<number, string> = {
    50: mix(primary, '#ffffff', 0.92),
    100: mix(primary, '#ffffff', 0.82),
    200: mix(primary, '#ffffff', 0.64),
    300: mix(primary, '#ffffff', 0.42),
    400: mix(primary, '#ffffff', 0.18),
    500: primary,
    600: mix(primary, '#000000', 0.1),
    700: dark,
    800: mix(dark, '#000000', 0.16),
    900: mix(dark, '#000000', 0.28),
    950: mix(dark, '#000000', 0.48),
  };
  Object.entries(values).forEach(([step, color]) => {
    root.style.setProperty(`--color-${prefix}-${step}`, color);
  });
}

/**
 * 切换主题。
 * - 预设主题：应用 CSS 变量并持久化；
 * - 自定义主题：把调色板和壁纸写入 CSS 变量，持久化由主题工坊的保存接口负责。
 */
export const applyTheme = (
  theme: ThemeType,
  options: { persist?: boolean; custom?: CustomTheme | null } = {}
): void => {
  const root = document.documentElement;
  root.classList.remove('theme-spice', 'theme-wood', 'theme-cream', 'theme-sage', 'theme-midnight', 'theme-custom', 'dark');
  CUSTOM_VARS.forEach((name) => root.style.removeProperty(name));

  const custom = options.custom ?? null;
  if (theme === 'custom' && custom) {
    const palette = custom.palette;
    root.classList.add('theme-custom');
    if (palette.isDark) root.classList.add('dark');

    root.style.setProperty('--theme-bg', palette.background);
    root.style.setProperty('--theme-card', palette.surface);
    root.style.setProperty('--theme-nav', palette.nav);
    root.style.setProperty('--theme-text', palette.text);
    root.style.setProperty('--theme-muted', palette.muted);
    root.style.setProperty('--theme-primary', palette.primary);
    root.style.setProperty('--theme-primary-hover', palette.primaryHover);
    root.style.setProperty('--theme-primary-light', palette.primaryLight);
    root.style.setProperty('--theme-primary-dark', palette.primaryDark);
    root.style.setProperty('--theme-border', `${palette.primary}33`);
    setScale(root, 'amber', palette.primary);
    setScale(root, 'rose', palette.accent);

    const wallpaper = custom.slots.background;
    if (wallpaper) {
      root.style.setProperty('--theme-wallpaper', `url("${wallpaper}")`);
      document.body.style.backgroundImage = `url("${wallpaper}")`;
    } else {
      document.body.style.backgroundImage = 'none';
    }
    document.body.style.backgroundColor = palette.background;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';

    if (options.persist !== false) void saveTheme('custom');
    return;
  }

  // 预设主题：清掉自定义的内联变量，让 index.css 中的预设变量生效
  document.body.style.backgroundImage = 'none';
  document.body.style.backgroundColor = '';
  document.body.style.backgroundSize = '';
  document.body.style.backgroundPosition = '';
  document.body.style.backgroundAttachment = '';

  const fallback: Exclude<ThemeType, 'custom'> = theme === 'custom' ? 'spice' : theme;
  root.classList.add(`theme-${fallback}`);
  if (fallback === 'midnight') root.classList.add('dark');

  if (options.persist !== false) {
    void saveTheme(fallback);
  }
};
