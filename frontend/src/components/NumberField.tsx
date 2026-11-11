import React from 'react';

interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | 'any';
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * 数字输入框
 *
 * 原生 `value={number}` 在清空时会立刻被改回 0，导致用户必须手动删掉那个 0。
 * 这里用内部字符串状态：清空时保持空白，失焦时才回退/提交，并支持小数中间态。
 */
export const NumberField: React.FC<NumberFieldProps> = ({
  value,
  onChange,
  min,
  max,
  step = 'any',
  placeholder,
  className,
  ariaLabel,
}) => {
  const [text, setText] = React.useState(String(value));
  const focused = React.useRef(false);

  React.useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    const parsed = Number(trimmed);
    if (trimmed === '' || !Number.isFinite(parsed)) {
      setText(String(value));
      return;
    }
    let next = parsed;
    if (typeof min === 'number') next = Math.max(min, next);
    if (typeof max === 'number') next = Math.min(max, next);
    onChange(next);
    setText(String(next));
  };

  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={text}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      className={className}
      onFocus={(event) => {
        focused.current = true;
        event.currentTarget.select();
      }}
      onChange={(event) => {
        const raw = event.target.value;
        setText(raw);
        if (raw.trim() === '' || raw === '-' || raw === '.' || raw === '-.') return;
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) onChange(parsed);
      }}
      onBlur={(event) => {
        focused.current = false;
        commit(event.target.value);
      }}
    />
  );
};
