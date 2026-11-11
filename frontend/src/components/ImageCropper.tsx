import React from 'react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

import type { Area, Point } from 'react-easy-crop';
import { Check, Loader2, X } from 'lucide-react';

interface ImageCropperProps {
  file: File;
  title?: string;
  aspect?: number;
  aspects?: number[];
  onCancel: () => void;
  onDone: (file: File) => void | Promise<void>;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败'));
    image.src = url;
  });
}

async function cropToFile(file: File, area: Area, aspectLabel: string): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(area.width, area.height));
    const width = Math.max(1, Math.round(area.width * scale));
    const height = Math.max(1, Math.round(area.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法创建裁剪画布');
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.9);
    });
    if (!blob) throw new Error('裁剪失败');
    const base = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${base}-${aspectLabel}.webp`, { type: 'image/webp' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  file,
  title = '裁剪图片',
  aspect = 4 / 3,
  aspects,
  onCancel,
  onDone,
}) => {
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [currentAspect, setCurrentAspect] = React.useState(aspect);
  const [pixels, setPixels] = React.useState<Area | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const src = React.useMemo(() => URL.createObjectURL(file), [file]);

  React.useEffect(() => () => URL.revokeObjectURL(src), [src]);

  const save = async () => {
    if (!pixels) return;
    setIsSaving(true);
    setError(null);
    try {
      const cropped = await cropToFile(file, pixels, `${currentAspect.toFixed(2)}`);
      await onDone(cropped);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6">
      <div className="w-full max-w-xl bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h3 className="font-serif-title text-lg font-bold text-stone-900 dark:text-stone-100">{title}</h3>
            <p className="text-[10px] text-stone-400">拖动图片调整位置，滚轮或滑杆缩放</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            aria-label="关闭裁剪"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden bg-stone-950">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={currentAspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, croppedPixels) => setPixels(croppedPixels)}
              showGrid
            />
          </div>

          {aspects && aspects.length > 1 && (
            <div className="flex items-center gap-1.5">
              {aspects.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCurrentAspect(value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                    Math.abs(currentAspect - value) < 0.001
                      ? 'bg-amber-700 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {value === 1 ? '1:1' : value === 4 / 3 ? '4:3' : '16:9'}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-stone-400 shrink-0">缩放</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-amber-700"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-xl p-2.5">{error}</div>
          )}
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={isSaving || !pixels}
            className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            使用裁剪
          </button>
        </div>
      </div>
    </div>
  );
};
