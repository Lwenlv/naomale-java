import React from 'react';
import {
  X,
  ImagePlus,
  Trash2,
  Sparkles,
  Check,
  Loader2,
  RotateCcw,
  Palette as PaletteIcon,
  Scissors,
} from 'lucide-react';
import type { CustomTheme, ThemePalette, ThemeSlots } from '../types';
import {
  analyzeTheme,
  clearCustomTheme,
  saveCustomTheme,
  uploadImage,
} from '../services/data';
import { ImageCropper } from './ImageCropper';

interface ThemeStudioProps {
  isOpen: boolean;
  onClose: () => void;
  customTheme?: CustomTheme | null;
  onNotify: (message: string) => void;
}

type SlotKey = keyof ThemeSlots;

const SLOTS: Array<{ key: SlotKey; label: string; hint: string }> = [
  { key: 'logo', label: 'Logo', hint: '顶部品牌图标' },
  { key: 'hero', label: '首页主图', hint: '首页大图背景' },
  { key: 'background', label: '页面背景', hint: '全站壁纸' },
  { key: 'navGallery', label: '菜谱图标', hint: '底部导航' },
  { key: 'navOrder', label: '点单图标', hint: '底部导航' },
  { key: 'navRandom', label: '抽签图标', hint: '底部导航' },
  { key: 'navNutrition', label: '营养图标', hint: '底部导航' },
  { key: 'navStats', label: '账本图标', hint: '底部导航' },
];

const DEFAULT_PALETTE: ThemePalette = {
  isDark: false,
  primary: '#e8a317',
  primaryHover: '#c9850b',
  primaryLight: '#fff4cc',
  primaryDark: '#8a5a00',
  accent: '#ff8a00',
  background: '#fff9e8',
  surface: '#ffffff',
  text: '#332400',
  muted: '#8a7a55',
  nav: '#fff4d6',
  overlay: 0.35,
  source: 'local',
};

const emptySlots = (): ThemeSlots => ({});

export const ThemeStudio: React.FC<ThemeStudioProps> = ({
  isOpen,
  onClose,
  customTheme,
  onNotify,
}) => {
  const [name, setName] = React.useState('我的主题');
  const [images, setImages] = React.useState<string[]>([]);
  const [slots, setSlots] = React.useState<ThemeSlots>(emptySlots);
  const [palette, setPalette] = React.useState<ThemePalette>({ ...DEFAULT_PALETTE });
  const [activeSlot, setActiveSlot] = React.useState<SlotKey>('logo');
  const [isUploading, setIsUploading] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cropTarget, setCropTarget] = React.useState<{ url: string; file: File } | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    if (customTheme) {
      setName(customTheme.name || '我的主题');
      setImages(customTheme.images || []);
      setSlots(customTheme.slots || {});
      setPalette({ ...DEFAULT_PALETTE, ...customTheme.palette });
    } else {
      setName('我的主题');
      setImages([]);
      setSlots(emptySlots());
      setPalette({ ...DEFAULT_PALETTE });
    }
    setActiveSlot('logo');
    setError(null);
  }, [isOpen, customTheme]);

  if (!isOpen) return null;

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    if (images.length + files.length > 12) {
      setError('一个主题最多上传 12 张图片');
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} 不是图片文件`);
        }
        uploaded.push(await uploadImage(file));
      }
      setImages((prev) => [...prev, ...uploaded.filter((url) => !prev.includes(url))]);

      // 新图优先填到空白槽位；槽位满了就只进素材池
      setSlots((prev) => {
        const next = { ...prev };
        for (const url of uploaded) {
          const empty = SLOTS.find((slot) => !next[slot.key]);
          if (!empty) break;
          next[empty.key] = url;
        }
        return next;
      });
      onNotify(`已上传 ${uploaded.length} 张主题图片`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
    } finally {
      setIsUploading(false);
    }
  };

  const assignImage = (url: string) => {
    setSlots((prev) => ({ ...prev, [activeSlot]: url }));
    const slot = SLOTS.find((item) => item.key === activeSlot);
    onNotify(`已把图片设置到「${slot?.label ?? '当前位置'}」`);
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((item) => item !== url));
    setSlots((prev) => {
      const next = { ...prev };
      SLOTS.forEach((slot) => {
        if (next[slot.key] === url) delete next[slot.key];
      });
      return next;
    });
  };

  const openCrop = async (url: string) => {
    setError(null);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'theme-image.webp', { type: blob.type || 'image/webp' });
      setCropTarget({ url, file });
    } catch {
      setError('图片读取失败，无法裁剪');
    }
  };

  const replaceImage = (oldUrl: string, newUrl: string) => {
    setImages((prev) => [...new Set(prev.map((url) => (url === oldUrl ? newUrl : url)))]);
    setSlots((prev) => {
      const next = { ...prev };
      SLOTS.forEach((slot) => {
        if (next[slot.key] === oldUrl) next[slot.key] = newUrl;
      });
      return next;
    });
  };

  const handleCropDone = async (file: File) => {
    if (!cropTarget) return;
    try {
      const newUrl = await uploadImage(file);
      replaceImage(cropTarget.url, newUrl);
      setCropTarget(null);
      onNotify('图片已裁剪');
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : String(cropError));
    }
  };

  const fillAll = () => {
    const first = images[0];
    if (!first) return;
    const next: ThemeSlots = {};
    SLOTS.forEach((slot) => {
      next[slot.key] = first;
    });
    setSlots(next);
    onNotify('已用第一张图填满所有位置');
  };

  const handleAnalyze = async () => {
    if (images.length === 0) {
      setError('请先上传至少一张图片');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeTheme(images);
      setPalette({ ...DEFAULT_PALETTE, ...result.palette });
      if (!name || name === '我的主题') setName(result.name || '我的主题');
      onNotify(result.palette.source === 'ai' ? 'AI 已提取主题配色' : '已按图片基础取色');
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : String(analyzeError));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (images.length === 0) {
      setError('请先上传至少一张图片');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await saveCustomTheme({
        name: name.trim() || '我的主题',
        images,
        slots,
        palette,
      });
      onNotify('主题已应用');
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('确认删除当前自定义主题并恢复默认主题？')) return;
    setIsSaving(true);
    try {
      await clearCustomTheme();
      onNotify('已恢复默认主题');
      onClose();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : String(resetError));
    } finally {
      setIsSaving(false);
    }
  };

  const hero = slots.hero || slots.background || images[0];
  const logoSrc = slots.logo;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6">
      <div className="relative w-full max-w-4xl bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-800 my-auto flex flex-col max-h-[96vh]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
          <div className="flex items-center gap-2">
            <PaletteIcon className="w-5 h-5 text-amber-700" />
            <div>
              <h3 className="font-serif-title text-xl font-bold text-stone-900 dark:text-stone-100">主题工坊</h3>
              <p className="text-[10px] text-stone-400">多图素材池 · 位置分配 · AI 配色</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">
          {/* 预览 */}
          <div
            className="relative rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 min-h-[170px] bg-stone-100"
            style={{
              backgroundImage: hero ? `url("${hero}")` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              className="absolute inset-0"
              style={{ backgroundColor: palette.background, opacity: hero ? palette.overlay : 0.9 }}
            />
            <div className="relative p-4 sm:p-5 text-white">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: palette.primary }}
                >
                  {logoSrc ? (
                    <img src={logoSrc} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <div className="font-serif-title text-lg font-bold drop-shadow-sm">{name || '我的主题'}</div>
                  <div className="text-[10px] opacity-80">主题效果预览</div>
                </div>
              </div>
              <p className="mt-6 font-serif-title text-xl sm:text-2xl font-bold drop-shadow-md">闹麻了点单</p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white"
                  style={{ backgroundColor: palette.primary }}
                >
                  主题按钮
                </span>
                <span className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-white/20 backdrop-blur">
                  次要按钮
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {SLOTS.slice(3).map((slot) => (
                  <span
                    key={slot.key}
                    className="w-7 h-7 rounded-full overflow-hidden border-2 flex items-center justify-center bg-white/25"
                    style={{ borderColor: slots[slot.key] ? palette.primary : 'rgba(255,255,255,.3)' }}
                  >
                    {slots[slot.key] ? (
                      <img src={slots[slot.key]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[8px] text-white/80">{slot.label.slice(0, 1)}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 素材池 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">素材池</h4>
                <p className="text-[10px] text-stone-400">上传多张图；点图片即可放到当前选中的位置 · 单张最大 8MB</p>
              </div>
              <span className="text-[10px] text-stone-400 font-mono">{images.length} / 12</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {images.map((url) => (
                <div key={url} className="relative aspect-square rounded-xl overflow-hidden group border border-stone-200 dark:border-stone-700">
                  <button type="button" onClick={() => assignImage(url)} className="w-full h-full">
                    <img src={url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    title="从主题中移除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void openCrop(url)}
                    className="absolute bottom-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    title="裁剪图片"
                  >
                    <Scissors className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-xl border border-dashed border-stone-300 dark:border-stone-700 flex flex-col items-center justify-center gap-1 cursor-pointer text-stone-500 hover:border-amber-500 hover:text-amber-700 transition-colors">
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                <span className="text-[9px]">上传图片</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void handleUpload(e)}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>

            {images.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={fillAll}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-[11px] font-semibold text-stone-700 dark:text-stone-300"
                >
                  全部使用第一张
                </button>
                <button
                  type="button"
                  onClick={() => void handleAnalyze()}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 rounded-xl bg-amber-700 text-white text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isAnalyzing ? 'AI 识别中…' : 'AI 识别配色'}
                </button>
                <span className="text-[10px] text-stone-400">
                  配色来源：{palette.source === 'ai' ? 'AI 识别' : '基础取色'}
                </span>
              </div>
            )}
          </section>

          {/* 位置分配 */}
          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">位置分配</h4>
              <p className="text-[10px] text-stone-400">
                当前正在设置：{SLOTS.find((slot) => slot.key === activeSlot)?.label}
                {slots[activeSlot] && (
                  <button
                    type="button"
                    onClick={() => {
                      setSlots((prev) => {
                        const next = { ...prev };
                        delete next[activeSlot];
                        return next;
                      });
                      onNotify('该位置将使用默认样式');
                    }}
                    className="ml-2 text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    使用默认（不替换）
                  </button>
                )}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SLOTS.map((slot) => (
                <button
                  key={slot.key}
                  type="button"
                  onClick={() => setActiveSlot(slot.key)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    activeSlot === slot.key
                      ? 'border-amber-500 ring-2 ring-amber-200 dark:ring-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20'
                      : 'border-stone-200 dark:border-stone-700 hover:border-amber-300'
                  }`}
                >
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 mb-1.5 flex items-center justify-center">
                    {slots[slot.key] ? (
                      <img src={slots[slot.key]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-stone-400">使用默认</span>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-stone-800 dark:text-stone-200">{slot.label}</div>
                  <div className="text-[9px] text-stone-400">{slot.hint}</div>
                </button>
              ))}
            </div>
          </section>

          {/* 名称 + 配色 */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">主题名称</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                className="w-full text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-stone-800 dark:text-stone-200"
                placeholder="例如：小黄鸭"
              />
            </div>
            <div>
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">识别出的配色</span>
              <div className="flex items-center gap-1.5">
                {[palette.primary, palette.accent, palette.background, palette.surface, palette.text].map((color, index) => (
                  <span
                    key={`${color}-${index}`}
                    className="w-7 h-7 rounded-full border border-black/10"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                <span className="text-[10px] text-stone-400 ml-1">{palette.isDark ? '深色' : '浅色'}主题</span>
              </div>
            </div>
          </section>

          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl p-3">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-stone-200 dark:border-stone-800 p-3 sm:p-4 flex items-center justify-between gap-2 bg-stone-50 dark:bg-stone-900">
          {customTheme ? (
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={isSaving}
              className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              恢复默认
            </button>
          ) : (
            <span className="text-[10px] text-stone-400">仅对当前账号生效 · 同一账号多设备同步</span>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || images.length === 0}
              className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              应用主题
            </button>
          </div>
        </div>
      </div>

      {cropTarget && (
        <ImageCropper
          file={cropTarget.file}
          title="裁剪主题图片"
          aspect={16 / 9}
          aspects={[16 / 9, 4 / 3, 1]}
          onCancel={() => setCropTarget(null)}
          onDone={(file) => void handleCropDone(file)}
        />
      )}
    </div>
  );
};
