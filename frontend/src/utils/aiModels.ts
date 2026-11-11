/**
 * DeepSeek 模型清单（前后端共用）
 *
 * 2026-09 之后官方 API 的模型名为：
 * - deepseek-flash    → DeepSeek-V4.1-Flash（快、便宜，支持 JSON / 视觉）
 * - deepseek-v4-pro   → DeepSeek-V4-Pro（更强）
 *
 * 旧的 deepseek-chat / deepseek-reasoner 已于 2026-07-24 停用，
 * 读取旧配置时在这里统一迁移到 deepseek-flash。
 * 参考：https://api-docs.deepseek.com/quick_start/pricing/
 */
export const DEFAULT_AI_MODEL = 'deepseek-flash';

export interface AIModelOption {
  id: string;
  label: string;
  note: string;
}

export const AI_MODELS: AIModelOption[] = [
  {
    id: 'deepseek-flash',
    label: 'deepseek-flash',
    note: 'V4.1 Flash · 快且便宜，日常识谱与营养点评首选',
  },
  {
    id: 'deepseek-v4-pro',
    label: 'deepseek-v4-pro',
    note: 'V4 Pro · 能力更强，适合很长的菜谱或复杂要求',
  },
];

const LEGACY_MODEL_MAP: Record<string, string> = {
  'deepseek-chat': 'deepseek-flash',
  'deepseek-reasoner': 'deepseek-flash',
  'deepseek-v3': 'deepseek-flash',
  'deepseek-v3.1': 'deepseek-flash',
  'deepseek-v3.2': 'deepseek-flash',
  'deepseek-v4-flash': 'deepseek-flash',
  'deepseek-v4-flash-vision-exp': 'deepseek-flash',
};

/** 把历史配置里的旧模型名收敛到当前可用模型 */
export function normalizeModelId(model: unknown): string {
  const id = typeof model === 'string' ? model.trim() : '';
  if (!id) return DEFAULT_AI_MODEL;
  return LEGACY_MODEL_MAP[id] ?? id;
}

export function modelLabel(model: string): string {
  return AI_MODELS.find((item) => item.id === model)?.label ?? model;
}
