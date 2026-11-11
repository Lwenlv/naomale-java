/**
 * 前端数据层
 *
 * 浏览器不再直接读写本地存储，而是：
 * 1. 启动时从 /api/bootstrap 拉取云端 MySQL 的完整快照；
 * 2. 任何修改都通过 REST 接口写入数据库，服务端回传最新快照；
 * 3. 订阅 /api/events（SSE），家里多台设备同时点单会实时同步；
 * 4. 点单编辑采用“本地立即生效 + 防抖落盘”，页面关闭前用 keepalive 兜底。
 */
import type {
  AIRecipeDraft,
  AppSettings,
  AuthState,
  BackupInfo,
  BootstrapPayload,
  CustomTheme,
  DataMeta,
  Dish,
  FamilyAccountMember,
  FamilyMember,
  FamilySummary,
  Ingredient,
  MealOrder,
  MediaUploadResult,
  NutritionInfo,
  ThemePalette,
  ThemeType,
} from '../types';

export type SyncStatus = 'connecting' | 'online' | 'saving' | 'offline';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** 未登录时抛出，让 App 展示登录/注册页 */
export class AuthRequiredError extends Error {
  constructor() {
    super('请先登录');
    this.name = 'AuthRequiredError';
  }
}

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  state?: BootstrapPayload;
  error?: string;
}

let snapshot: BootstrapPayload | null = null;
let orderDraft: MealOrder | null = null;
let orderDirty = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveSeq = 0;
let syncStatus: SyncStatus = 'connecting';
let eventSource: EventSource | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let initPromise: Promise<BootstrapPayload> | null = null;
let unloadHooksInstalled = false;
let lastLocalMutationAt = 0;

const listeners = new Set<(state: BootstrapPayload | null) => void>();
const errorListeners = new Set<(message: string) => void>();
const statusListeners = new Set<(status: SyncStatus) => void>();

/* ------------------------------------------------------------------ */
/* 基础工具                                                            */
/* ------------------------------------------------------------------ */

function setStatus(status: SyncStatus): void {
  if (syncStatus === status) return;
  syncStatus = status;
  for (const listener of statusListeners) listener(status);
}

export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

export function onSyncStatus(listener: (status: SyncStatus) => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function onError(listener: (message: string) => void): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

function notifyError(message: string): void {
  for (const listener of errorListeners) {
    try {
      listener(message);
    } catch {
      /* 忽略监听器异常 */
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function request<T>(url: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (init.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch {
    setStatus('offline');
    throw new Error('网络连接失败，请稍后重试');
  }

  const text = await response.text();
  let payload: ApiEnvelope<T> | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      payload = null;
    }
  }

  if (!response.ok || !payload?.ok) {
    const message = payload?.error || `请求失败（HTTP ${response.status}）`;
    if (response.status >= 500) setStatus('offline');
    throw new ApiError(response.status, message);
  }

  setStatus(syncStatus === 'offline' ? 'online' : syncStatus);
  return payload;
}

function emit(): void {
  const state = snapshot ? getState() : null;
  for (const listener of listeners) {
    try {
      listener(state);
    } catch (error) {
      console.error('[data] 订阅回调异常', error);
    }
  }
}

function applyState(next: BootstrapPayload): void {
  snapshot = next;
  // 用户正在编辑点单时不覆盖本地草稿，避免多设备同步打断输入
  if (!orderDirty) orderDraft = next.currentOrder;
  emit();
}

async function mutate<T>(url: string, method: string, body?: unknown): Promise<{ data: T; state?: BootstrapPayload }> {
  const result = await request<T>(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  lastLocalMutationAt = Date.now();
  if (result.state) applyState(result.state);
  return { data: result.data as T, state: result.state };
}

/* ------------------------------------------------------------------ */
/* 初始化 / 订阅                                                       */
/* ------------------------------------------------------------------ */

export function subscribe(listener: (state: BootstrapPayload | null) => void): () => void {
  listeners.add(listener);
  if (snapshot) listener(getState());
  return () => listeners.delete(listener);
}

export function getState(): BootstrapPayload {
  if (!snapshot) throw new Error('数据尚未加载');
  return { ...snapshot, currentOrder: orderDraft ?? snapshot.currentOrder };
}

export function getSettings(): AppSettings | null {
  return snapshot?.settings ?? null;
}

function applyBootstrap(data: BootstrapPayload): BootstrapPayload {
  snapshot = data;
  orderDraft = data.currentOrder;
  orderDirty = false;
  setStatus('online');
  emit();
  connectEvents();
  installUnloadHooks();
  return getState();
}

export function initData(): Promise<BootstrapPayload> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    setStatus('connecting');
    const { data } = await request<BootstrapPayload>('/api/bootstrap');
    if (!data) throw new Error('数据服务返回了空快照');
    return applyBootstrap(data);
  })().catch((error) => {
    initPromise = null;
    if (error instanceof ApiError && error.status === 401) {
      setStatus('online');
      throw new AuthRequiredError();
    }
    setStatus('offline');
    throw error;
  });

  return initPromise;
}

/* ------------------------------------------------------------------ */
/* 账号 / 家庭                                                         */
/* ------------------------------------------------------------------ */

export interface AuthCredentials {
  username: string;
  password: string;
  displayName?: string;
}

export async function registerAccount(input: AuthCredentials): Promise<BootstrapPayload> {
  const { data } = await request<BootstrapPayload>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!data) throw new Error('注册失败：返回数据为空');
  initPromise = Promise.resolve(data);
  return applyBootstrap(data);
}

export async function loginAccount(username: string, password: string): Promise<BootstrapPayload> {
  const { data } = await request<BootstrapPayload>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (!data) throw new Error('登录失败：返回数据为空');
  initPromise = Promise.resolve(data);
  return applyBootstrap(data);
}

export async function logoutAccount(): Promise<void> {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch {
    /* 即使会话已过期，本地也照常退出 */
  } finally {
    snapshot = null;
    orderDraft = null;
    orderDirty = false;
    initPromise = null;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    setStatus('online');
    emit();
  }
}

async function applyFamilyBootstrap(pathname: string, body?: unknown): Promise<BootstrapPayload> {
  const { data } = await request<BootstrapPayload>(pathname, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
  if (!data) throw new Error('家庭操作失败：返回数据为空');
  return applyBootstrap(data);
}

export async function switchFamily(familyId: string): Promise<BootstrapPayload> {
  return applyFamilyBootstrap(`/api/families/${encodeURIComponent(familyId)}/switch`);
}

export async function createFamily(name: string): Promise<BootstrapPayload> {
  return applyFamilyBootstrap('/api/families', { name });
}

export async function joinFamily(inviteCode: string): Promise<BootstrapPayload> {
  return applyFamilyBootstrap('/api/families/join', { inviteCode });
}

export async function fetchFamilyInvite(familyId: string): Promise<string> {
  const { data } = await request<{ inviteCode: string }>(
    `/api/families/${encodeURIComponent(familyId)}/invite`
  );
  return data?.inviteCode ?? '';
}

export async function fetchFamilyMembers(familyId: string): Promise<FamilyAccountMember[]> {
  const { data } = await request<FamilyAccountMember[]>(
    `/api/families/${encodeURIComponent(familyId)}/members`
  );
  return (data as FamilyAccountMember[]) ?? [];
}

export function getAuthState(): AuthState | null {
  return snapshot?.auth ?? null;
}

export function getFamilyList(): FamilySummary[] {
  return snapshot?.auth.families ?? [];
}

function connectEvents(): void {
  if (eventSource || typeof EventSource === 'undefined') return;
  try {
    eventSource = new EventSource('/api/events');
    eventSource.onopen = () => setStatus('online');
    eventSource.onerror = () => {
      // 浏览器会自动重连，这里只更新状态提示
      if (eventSource?.readyState === EventSource.CLOSED) setStatus('offline');
    };
    eventSource.onmessage = (event) => {
      // 多家庭时只关心当前激活家庭的事件
      try {
        const payload = JSON.parse(event.data);
        const active = snapshot?.auth.activeFamilyId;
        if (payload?.familyId && active && payload.familyId !== active) return;
      } catch {
        /* ready 事件等无 JSON 内容 */
      }
      scheduleRefresh();
    };
  } catch {
    /* 不支持 SSE 时退化为手动刷新 */
  }
}

function scheduleRefresh(): void {
  // 自己刚写过的数据不需要再拉一次
  if (Date.now() - lastLocalMutationAt < 800) return;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshFromServer();
  }, 150);
}

export async function refreshFromServer(): Promise<BootstrapPayload | null> {
  try {
    const { data } = await request<BootstrapPayload>('/api/bootstrap');
    if (!data) return null;
    applyState(data);
    setStatus('online');
    return getState();
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 当前点单（本地即时 + 防抖落盘）                                      */
/* ------------------------------------------------------------------ */

function cancelPendingSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

export function updateCurrentOrder(next: MealOrder): void {
  orderDraft = { ...next };
  orderDirty = true;
  setStatus('saving');
  emit();
  cancelPendingSave();
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void persistCurrentOrder();
  }, 350);
}

/** 立即把当前点单写入数据库（归档 / 切换页面前调用） */
export async function persistCurrentOrder(): Promise<void> {
  if (!orderDraft || !orderDirty) return;
  cancelPendingSave();

  const payload = orderDraft;
  const seq = ++saveSeq;
  setStatus('saving');

  try {
    const { data, state } = await request<MealOrder>('/api/current-order', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    lastLocalMutationAt = Date.now();
    if (seq === saveSeq) {
      orderDirty = false;
      if (data) orderDraft = data;
    }
    if (state) applyState(state);
    setStatus('online');
  } catch (error) {
    setStatus('offline');
    notifyError(`点单保存失败：${errorMessage(error)}`);
    // 保持 dirty，下次编辑或离开页面时会重试
  }
}

export async function flushCurrentOrder(): Promise<void> {
  if (!orderDirty) {
    cancelPendingSave();
    return;
  }
  await persistCurrentOrder();
}

export async function clearCurrentOrder(): Promise<MealOrder> {
  cancelPendingSave();
  saveSeq += 1;
  const { data, state } = await mutate<MealOrder>('/api/current-order', 'DELETE');
  orderDirty = false;
  orderDraft = data;
  if (state) applyState(state);
  emit();
  return data;
}

export async function archiveCurrentOrder(actualCost?: number): Promise<MealOrder> {
  await flushCurrentOrder();
  cancelPendingSave();
  saveSeq += 1;
  const { data, state } = await mutate<{ archived: MealOrder; currentOrder: MealOrder }>(
    '/api/current-order/archive',
    'POST',
    { actualCost }
  );
  orderDirty = false;
  orderDraft = data.currentOrder;
  if (state) applyState(state);
  emit();
  return data.archived;
}

export async function reorderHistory(orderId: string): Promise<MealOrder> {
  cancelPendingSave();
  saveSeq += 1;
  const { data, state } = await mutate<MealOrder>(`/api/orders/${encodeURIComponent(orderId)}/reorder`, 'POST');
  orderDirty = false;
  orderDraft = data;
  if (state) applyState(state);
  emit();
  return data;
}

export async function deleteHistoryOrder(orderId: string): Promise<void> {
  await mutate(`/api/orders/${encodeURIComponent(orderId)}`, 'DELETE');
}

/* ------------------------------------------------------------------ */
/* 菜谱 / 成员                                                         */
/* ------------------------------------------------------------------ */

export async function saveDish(dish: Dish): Promise<Dish> {
  const { data } = await mutate<Dish>('/api/dishes', 'POST', dish);
  return data;
}

export async function deleteDish(id: string): Promise<void> {
  await mutate(`/api/dishes/${encodeURIComponent(id)}`, 'DELETE');
}

export async function toggleDishFavorite(id: string, favorite: boolean): Promise<Dish> {
  const { data } = await mutate<Dish>(`/api/dishes/${encodeURIComponent(id)}/favorite`, 'PATCH', {
    favorite,
  });
  return data;
}

export async function saveMembers(members: FamilyMember[]): Promise<FamilyMember[]> {
  const { data } = await mutate<FamilyMember[]>('/api/members', 'PUT', { members });
  return data;
}

export async function addMember(member: Omit<FamilyMember, 'id'> & { id?: string }): Promise<FamilyMember> {
  const { data } = await mutate<FamilyMember>('/api/members', 'POST', { member });
  return data;
}

export async function deleteMember(id: string): Promise<FamilyMember[]> {
  const { data } = await mutate<FamilyMember[]>(`/api/members/${encodeURIComponent(id)}`, 'DELETE');
  return data;
}

/* ------------------------------------------------------------------ */
/* 设置 / 主题 / AI                                                    */
/* ------------------------------------------------------------------ */

export interface AISettingsPatch {
  provider?: 'deepseek' | 'gemini';
  model?: string;
  /** null 表示清除密钥，undefined / 空字符串表示保持不变 */
  deepseekApiKey?: string | null;
  geminiApiKey?: string | null;
}

export async function saveSettings(patch: { ai?: AISettingsPatch; theme?: ThemeType }): Promise<AppSettings> {
  const { data } = await mutate<AppSettings>('/api/settings', 'PUT', patch);
  return data;
}

export async function saveTheme(theme: string): Promise<void> {
  if (snapshot) {
    snapshot = { ...snapshot, settings: { ...snapshot.settings, theme } };
    emit();
  }
  try {
    await mutate('/api/theme/active', 'PUT', { theme });
  } catch (error) {
    notifyError(`主题保存失败：${errorMessage(error)}`);
  }
}

/** 从已上传图片中提取主题配色（AI 优先，失败时服务端本地取色）。 */
export async function analyzeTheme(imageUrls: string[]): Promise<{ name: string; palette: ThemePalette }> {
  const { data } = await request<{ name: string; palette: ThemePalette }>('/api/theme/analyze', {
    method: 'POST',
    body: JSON.stringify({ imageUrls }),
  });
  return data as { name: string; palette: ThemePalette };
}

export async function saveCustomTheme(theme: CustomTheme): Promise<BootstrapPayload> {
  const { state } = await mutate<CustomTheme>('/api/theme', 'PUT', theme);
  if (!state) throw new Error('主题保存失败：服务端没有返回最新状态');
  return state;
}

export async function clearCustomTheme(): Promise<BootstrapPayload> {
  const { state } = await mutate('/api/theme', 'DELETE');
  if (!state) throw new Error('主题清除失败：服务端没有返回最新状态');
  return state;
}

export async function testAIConnection(): Promise<{
  model: string;
  models: string[];
  modelAvailable: boolean;
}> {
  const { data } = await request<{ model: string; models: string[]; modelAvailable: boolean }>('/api/ai/test', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return data as { model: string; models: string[]; modelAvailable: boolean };
}

export async function parseRecipeWithServer(text: string, imageDataUrl?: string): Promise<AIRecipeDraft> {
  const { data } = await request<AIRecipeDraft>('/api/ai/parse-recipe', {
    method: 'POST',
    body: JSON.stringify(imageDataUrl ? { text, imageDataUrl } : { text }),
  });
  return data as AIRecipeDraft;
}

export async function requestNutritionAdvice(payload: {
  dishNames: string[];
  dinerCount: number;
  totals: NutritionInfo;
}): Promise<string> {
  const { data } = await request<{ advice: string }>('/api/ai/nutrition-advice', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return (data as { advice: string }).advice;
}

/** 已接入 DeepSeek 时，让 AI 根据食材重新估算整盘营养 */
export async function estimateNutritionWithAI(
  name: string,
  ingredients: Ingredient[],
  servings?: number
): Promise<NutritionInfo> {
  const { data } = await request<{ nutrition: NutritionInfo }>('/api/ai/nutrition', {
    method: 'POST',
    body: JSON.stringify({
      name,
      servings,
      ingredients: ingredients.map((item) => ({ name: item.name, amount: item.amount })),
    }),
  });
  if (!data?.nutrition) throw new Error('AI 没有返回营养数据');
  return data.nutrition;
}

/* ------------------------------------------------------------------ */
/* 图片上传                                                            */
/* ------------------------------------------------------------------ */

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_SOURCE_IMAGE_BYTES = 30 * 1024 * 1024;

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片解码失败'));
    image.src = dataUrl;
  });
}

/** 上传前压到 1920px 以内，主题壁纸/菜品照片都能明显减少传输体积。 */
export async function optimizeImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file;
  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);
  if (Math.max(image.width, image.height) <= 1920 && file.size <= 1.2 * 1024 * 1024) {
    return file;
  }

  const scale = Math.min(1, 1920 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', 0.86);
  });
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
  return new File([blob], name, { type: 'image/webp' });
}

/** 直接上传已压缩的 dataURL，供 AI 识谱图片复用，避免二次压缩。 */
export async function uploadImageDataUrl(dataUrl: string, fileName: string): Promise<string> {
  const { data } = await request<MediaUploadResult>('/api/media', {
    method: 'POST',
    body: JSON.stringify({ fileName, dataUrl }),
  });
  if (!data?.url) throw new Error('图片上传失败');
  return data.url;
}

/** 上传菜品/主题照片：压缩后写入 MySQL media 表，返回可直接访问的 /media/xxx 地址 */
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件（PNG / JPEG / WebP / GIF）');
  if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error('图片不能超过 30MB');
  const optimized = await optimizeImage(file);
  if (optimized.size > MAX_IMAGE_BYTES) throw new Error('图片压缩后仍超过 8MB，请换一张小一点的图');
  const dataUrl = await fileToDataUrl(optimized);
  return uploadImageDataUrl(dataUrl, optimized.name);
}

/* ------------------------------------------------------------------ */
/* 备份 / 导入导出 / 健康检查                                           */
/* ------------------------------------------------------------------ */

export function exportData(): void {
  // 让浏览器直接下载服务端生成的备份文件（不含 API Key）
  window.location.href = '/api/export';
}

export async function importData(payload: unknown): Promise<void> {
  const { state } = await mutate('/api/import', 'POST', payload);
  orderDirty = false;
  if (state) {
    orderDraft = state.currentOrder;
    applyState(state);
  }
  emit();
}

export async function resetData(): Promise<void> {
  const { state } = await mutate('/api/reset', 'POST');
  orderDirty = false;
  if (state) {
    orderDraft = state.currentOrder;
    applyState(state);
  }
  emit();
}

export async function fetchHealth(): Promise<DataMeta> {
  const { data } = await request<DataMeta>('/api/health');
  return data as DataMeta;
}

export async function listBackups(): Promise<BackupInfo[]> {
  const { data } = await request<BackupInfo[]>('/api/backups');
  return (data as BackupInfo[]) ?? [];
}

export async function restoreBackup(file: string): Promise<void> {
  const { state } = await mutate('/api/backups/restore', 'POST', { file });
  orderDirty = false;
  if (state) {
    orderDraft = state.currentOrder;
    applyState(state);
  }
  emit();
}

/* ------------------------------------------------------------------ */
/* 页面关闭前兜底落盘                                                   */
/* ------------------------------------------------------------------ */

function installUnloadHooks(): void {
  if (unloadHooksInstalled) return;
  unloadHooksInstalled = true;

  const flush = () => {
    if (!orderDraft || !orderDirty) return;
    try {
      void fetch('/api/current-order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderDraft),
        keepalive: true,
      });
      orderDirty = false;
    } catch {
      /* 页面已在卸载，忽略 */
    }
  };

  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('online', () => {
    setStatus('online');
    void refreshFromServer();
  });
  window.addEventListener('offline', () => setStatus('offline'));
}
