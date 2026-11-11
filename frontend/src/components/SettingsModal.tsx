import React from 'react';
import {
  X,
  Key,
  Check,
  Sparkles,
  ShieldCheck,
  Database,
  Loader2,
  AlertTriangle,
  Wifi,
  Settings2,
  Palette,
} from 'lucide-react';
import type { AppSettings, DataMeta } from '../types';
import { fetchHealth, saveSettings, testAIConnection } from '../services/data';
import { formatDateTime } from '../utils/date';
import { AI_MODELS, DEFAULT_AI_MODEL } from '../utils/aiModels';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  meta: DataMeta;
  onNotify: (message: string) => void;
  onOpenThemeStudio: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  meta,
  onNotify,
  onOpenThemeStudio,
}) => {
  const [model, setModel] = React.useState(settings.ai.model || DEFAULT_AI_MODEL);
  const [apiKeyInput, setApiKeyInput] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [liveMeta, setLiveMeta] = React.useState<DataMeta>(meta);

  const refreshMeta = React.useCallback(async () => {
    try {
      setLiveMeta(await fetchHealth());
    } catch {
      /* 设置面板打开时服务偶发不可用不阻塞 UI */
    }
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    setModel(settings.ai.model || DEFAULT_AI_MODEL);
    setApiKeyInput('');
    setTestResult(null);
    void refreshMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, refreshMeta]);

  if (!isOpen) return null;

  const hasKey = settings.ai.hasKey;

  const handleSaveAI = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setTestResult(null);
    try {
      const patch: Parameters<typeof saveSettings>[0] = { ai: { model } };
      if (apiKeyInput.trim()) patch.ai!.deepseekApiKey = apiKeyInput.trim();
      await saveSettings(patch);
      setApiKeyInput('');
      onNotify('AI 配置已保存');
      await refreshMeta();
    } catch (error) {
      onNotify(`保存失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearKey = async () => {
    if (!window.confirm('确认清除已保存的 DeepSeek API Key？清除后将使用基础识别与营养估算。')) return;
    setIsSaving(true);
    try {
      await saveSettings({ ai: { deepseekApiKey: null } });
      setApiKeyInput('');
      setTestResult({ ok: true, message: '已清除服务端保存的 API Key。' });
      onNotify('已清除 DeepSeek API Key');
    } catch (error) {
      onNotify(`清除失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // 先保存当前模型/新 Key，避免检测的是旧配置
      const patch: Parameters<typeof saveSettings>[0] = { ai: { model } };
      if (apiKeyInput.trim()) patch.ai!.deepseekApiKey = apiKeyInput.trim();
      await saveSettings(patch);
      setApiKeyInput('');

      const result = await testAIConnection();
      if (result.modelAvailable) {
        setTestResult({
          ok: true,
          message: `连接成功，当前模型 ${result.model}${result.models.length ? `（账号可用 ${result.models.length} 个模型）` : ''}`,
        });
      } else {
        setTestResult({
          ok: false,
          message: `Key 有效，但模型 ${result.model} 不在账号可用列表中：${result.models.join('、') || '（接口未返回模型列表）'}`,
        });
      }
    } catch (error) {
      setTestResult({ ok: false, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-800 my-auto flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-amber-700" />
            <h3 className="font-serif-title text-xl font-bold text-stone-900 dark:text-stone-100">
              系统设置
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            title="关闭"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6 space-y-8 flex-1">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100 font-serif-title">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>数据概览</span>
              <span className="ml-auto text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                已同步
              </span>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 p-3.5 space-y-3">
              <div>
                <span className="text-[10px] text-stone-400 block mb-1">存储位置</span>
                <span className="flex items-center gap-1.5 text-[11px] text-stone-700 dark:text-stone-300">
                  <Database className="w-3 h-3 text-stone-400 shrink-0" />
                  云端数据库 · 多设备同步
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center">
                {[
                  { label: '菜谱', value: liveMeta.counts.dishes },
                  { label: '历史账单', value: liveMeta.counts.orders },
                  { label: '家庭成员', value: liveMeta.counts.members },
                  { label: '菜品图片', value: liveMeta.counts.media },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-700 py-1.5">
                    <span className="text-[10px] text-stone-400 block font-sans">{item.label}</span>
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-200 tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-stone-500 font-mono">
                <span>最后保存：{formatDateTime(liveMeta.lastSavedAt)}</span>
                <span>系统日志：已开启</span>
              </div>

              <p className="text-[10px] text-stone-400 leading-relaxed">
                账号成员、邀请码和家庭切换，在顶部家庭菜单中管理。
              </p>

              <button
                type="button"
                onClick={onOpenThemeStudio}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 py-2 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors"
              >
                <Palette className="w-4 h-4" />
                打开主题工坊 · 上传图片生成主题
              </button>

              {liveMeta.warnings.length > 0 && (
                <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-2.5 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{liveMeta.warnings.join(' ')}</span>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100 font-serif-title">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>DeepSeek 智能模型</span>
              {hasKey ? (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                  已配置 {settings.ai.maskedKey}
                </span>
              ) : (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 border border-stone-200 dark:border-stone-700">
                  未配置 · 基础模式
                </span>
              )}
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              配置后，录菜页可以粘贴文字，也可以上传菜谱图片，由 <strong className="text-stone-700 dark:text-stone-300">deepseek-flash</strong>{' '}
              直接识别菜名、食材和做法；营养页可生成 AI 点评。Key 仅保存在服务端，不会下发到浏览器。
            </p>

            <form onSubmit={handleSaveAI} className="space-y-3 bg-stone-50 dark:bg-stone-800/60 p-4 rounded-2xl border border-stone-200 dark:border-stone-700">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                  DeepSeek API Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder={hasKey ? `已保存 ${settings.ai.maskedKey}，留空则不修改` : 'sk-...'}
                    value={apiKeyInput}
                    onChange={(event) => setApiKeyInput(event.target.value)}
                    className="w-full text-xs font-mono rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 pl-9 pr-3 py-2 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <a
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-1 text-[10px] text-amber-700 dark:text-amber-400 underline underline-offset-2"
                >
                  没有 Key？去 DeepSeek 开放平台创建一个
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">模型</label>
                  <select
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    className="w-full text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 px-3 py-2 text-stone-800 dark:text-stone-200"
                  >
                    {AI_MODELS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-stone-400 mt-1 block leading-relaxed">
                    {AI_MODELS.find((option) => option.id === model)?.note ?? model}
                  </span>
                </div>

                <div className="sm:col-span-2 flex items-end gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>保存配置</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleTestConnection()}
                    disabled={isTesting}
                    className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                    <span>检测连接</span>
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`text-[11px] rounded-xl p-2.5 leading-relaxed ${
                    testResult.ok
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {testResult.message}
                </div>
              )}

              {hasKey && (
                <button
                  type="button"
                  onClick={() => void handleClearKey()}
                  className="text-[11px] text-rose-500 hover:text-rose-700"
                >
                  清除已保存的 API Key
                </button>
              )}

              <p className="text-[10px] text-stone-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                密钥仅保存在服务端，服务端代理调用，前端只显示脱敏后的尾号。
              </p>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};
