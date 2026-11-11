/**
 * 闹麻了点单 · 全局数据类型
 *
 * 数据全部由 Spring Boot 后端写入云端 MySQL，前端仅持有内存快照，类型定义由前后端共享。
 */

export type DishCategory = 'meat' | 'seafood' | 'veggie' | 'soup' | 'staple' | 'light' | 'fruit';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'supper';

export type OrderStatus = 'planned' | 'cooking' | 'served' | 'completed';

export type ThemeType = 'spice' | 'wood' | 'sage' | 'midnight' | 'custom';

export type AIProvider = 'deepseek' | 'gemini';

export interface Ingredient {
  name: string;
  amount: string;
  category?: 'main' | 'seasoning' | 'garnish';
}

export interface CookingStep {
  order: number;
  title: string;
  instruction: string;
  tip?: string;
  durationMins?: number;
}

export interface NutritionInfo {
  calories: number; // kcal
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber: number; // g
  sodium: number; // mg
  sugar?: number; // g
  vitaminA?: number; // μg RAE
  vitaminB1?: number; // mg
  vitaminB2?: number; // mg
  vitaminB6?: number; // mg
  vitaminC?: number; // mg
  vitaminE?: number; // mg
  folate?: number; // μg DFE
  potassium?: number; // mg
  magnesium?: number; // mg
  calcium?: number; // mg
}

export interface Dish {
  id: string;
  name: string;
  pinyin?: string;
  category: DishCategory;
  cuisine: string;
  prepTime: number; // 准备耗时（分钟）
  cookTime: number; // 烹饪耗时（分钟）
  difficulty: Difficulty;
  estimatedPrice: number; // 预估单份成本（元）
  servings: number; // 建议就餐人数
  coverImage: string;
  description: string;
  ingredients: Ingredient[];
  steps: CookingStep[];
  nutrition: NutritionInfo;
  tags: string[];
  isFavorite?: boolean;
  cookCount: number; // 累计做过次数
  lastCookedDate?: string;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  avatarBg: string;
  dietaryPreference?: string;
}

export interface OrderItem {
  id: string;
  dishId: string;
  /** 下单时的菜品快照；读取时会优先用菜谱库中的最新数据覆盖 */
  dish: Dish;
  quantity: number;
  member: string;
  notes: string;
  customPrice: number;
}

export interface MealOrder {
  id: string;
  title: string;
  mealType: MealType;
  date: string; // YYYY-MM-DD（本地时区）
  dinerCount: number;
  chef: string;
  items: OrderItem[];
  totalEstimatedCost: number;
  actualCost?: number;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
}

/**
 * 仅服务端持有的 AI 密钥配置（绝不下发到浏览器）
 */
export interface AISecrets {
  provider: AIProvider;
  model: string;
  deepseekApiKey?: string;
  geminiApiKey?: string;
}

/** 下发到浏览器的 AI 配置（密钥已脱敏） */
export interface PublicAISettings {
  provider: AIProvider;
  model: string;
  hasKey: boolean;
  maskedKey: string;
}

export interface AppSettings {
  ai: PublicAISettings;
  theme: ThemeType;
  customTheme?: CustomTheme | null;
}

export interface ThemePalette {
  isDark: boolean;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  nav: string;
  overlay: number;
  source?: 'ai' | 'local';
}

export interface ThemeSlots {
  logo?: string;
  hero?: string;
  background?: string;
  navGallery?: string;
  navOrder?: string;
  navRandom?: string;
  navNutrition?: string;
  navStats?: string;
}

export interface CustomTheme {
  name: string;
  images: string[];
  slots: ThemeSlots;
  palette: ThemePalette;
}

export interface DataCounts {
  dishes: number;
  members: number;
  orders: number;
  media: number;
}

export interface DataMeta {
  appName: string;
  dataDir: string;
  schemaVersion: number;
  counts: DataCounts;
  createdAt: string | null;
  updatedAt: string | null;
  lastSavedAt: string | null;
  backupCount: number;
  auditLogPath: string;
  warnings: string[];
}

/** 登录账号（不含密码哈希，可安全下发） */
export interface AccountUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface FamilySummary {
  id: string;
  name: string;
  ownerId: string;
  role: 'owner' | 'member';
  memberCount: number;
  inviteCode: string;
  createdAt: string;
}

export interface AuthState {
  user: AccountUser;
  families: FamilySummary[];
  activeFamilyId: string;
}

/** 家庭里的账号成员（与“点菜成员”是两套概念） */
export interface FamilyAccountMember {
  userId: string;
  username: string;
  displayName: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

/** 单个家庭的数据快照（不含账号信息） */
export type FamilySnapshot = Omit<BootstrapPayload, 'auth'>;

/** 前端启动 / 每次数据变更后拿到的完整快照 */
export interface BootstrapPayload {
  schemaVersion: number;
  dishes: Dish[];
  members: FamilyMember[];
  ordersHistory: MealOrder[];
  currentOrder: MealOrder;
  settings: AppSettings;
  meta: DataMeta;
  auth: AuthState;
}

export interface BackupInfo {
  file: string;
  createdAt: string;
  bytes: number;
}

export interface MediaUploadResult {
  url: string;
  file: string;
  bytes: number;
}

/** 导出备份文件的结构（不包含任何 API Key） */
export interface ExportBundle {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  dishes: Dish[];
  members: FamilyMember[];
  ordersHistory: MealOrder[];
  currentOrder: MealOrder;
  settings: {
    ai: { provider: AIProvider; model: string; hasKey: boolean };
    theme: ThemeType;
  };
}

export interface AIRecipeDraft {
  name: string;
  category: DishCategory;
  cuisine: string;
  prepTime: number;
  cookTime: number;
  difficulty: Difficulty;
  estimatedPrice: number;
  servings: number;
  description: string;
  ingredients: Ingredient[];
  steps: Array<Omit<CookingStep, 'order'> & { order?: number }>;
  tags: string[];
  nutrition: NutritionInfo;
}
