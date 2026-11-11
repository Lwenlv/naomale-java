import React from 'react';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

/** 点击图片查看大图 */
export const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt = '', onClose }) => {
  React.useEffect(() => {
    if (!src) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt || '查看大图'}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭大图"
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
      />
    </div>
  );
};
