/**
 * 本地营养估算引擎（前后端共用，纯函数、无副作用）
 *
 * 原版把食材营养表写在 src/services/ai.ts 中，只有前端能用到；
 * 现在服务端也会用它做离线兜底，但已接入 AI 时以 AI 结果为准。
 * 保证“落盘的每一条菜谱都有完整营养字段”。
 */
import type { DishCategory, Ingredient, NutritionInfo } from '../types';

interface FoodNutrition {
  cal: number;
  p: number;
  c: number;
  f: number;
  fiber: number;
  sodium: number;
  sugar?: number;
  vitaminA?: number;
  vitaminB1?: number;
  vitaminB2?: number;
  vitaminB6?: number;
  vitaminC?: number;
  vitaminE?: number;
  folate?: number;
  potassium?: number;
  magnesium?: number;
  calcium?: number;
}

/** 每 100g 可食部营养值 */
export const FOOD_NUTRITION_LOOKUP: Record<string, FoodNutrition> = {
  五花肉: { cal: 395, p: 13.2, c: 1.5, f: 37.0, fiber: 0, sodium: 50 },
  猪肉: { cal: 250, p: 20.0, c: 1.0, f: 18.0, fiber: 0, sodium: 60 },
  排骨: { cal: 278, p: 18.3, c: 0.7, f: 23.1, fiber: 0, sodium: 62 },
  牛肉: { cal: 180, p: 26.0, c: 0.5, f: 8.0, fiber: 0, sodium: 70 },
  牛里脊: { cal: 155, p: 27.0, c: 0, f: 5.0, fiber: 0, sodium: 65 },
  鸡胸肉: { cal: 133, p: 28.0, c: 0, f: 2.5, fiber: 0, sodium: 60 },
  鸡翅: { cal: 194, p: 17.4, c: 4.6, f: 11.8, fiber: 0, sodium: 85 },
  鸡肉: { cal: 167, p: 24.0, c: 0, f: 7.0, fiber: 0, sodium: 70 },
  鲈鱼: { cal: 105, p: 21.0, c: 0.2, f: 2.2, fiber: 0, sodium: 70 },
  鱼: { cal: 110, p: 22.0, c: 0, f: 2.5, fiber: 0, sodium: 60 },
  虾: { cal: 93, p: 20.0, c: 0.5, f: 1.0, fiber: 0, sodium: 150 },
  鸡蛋: { cal: 147, p: 13.0, c: 1.5, f: 10.0, fiber: 0, sodium: 140 },
  鸭蛋: { cal: 180, p: 12.6, c: 3.1, f: 13.0, fiber: 0, sodium: 106 },
  鹅蛋: { cal: 196, p: 11.1, c: 2.8, f: 15.6, fiber: 0, sodium: 90 },
  鹌鹑蛋: { cal: 160, p: 12.8, c: 1.0, f: 11.1, fiber: 0, sodium: 106 },
  咸蛋黄: { cal: 263, p: 14.0, c: 4.0, f: 22.0, fiber: 0, sodium: 1500 },
  咸蛋: { cal: 190, p: 12.7, c: 3.5, f: 13.5, fiber: 0, sodium: 1200 },
  豆腐: { cal: 81, p: 8.0, c: 2.0, f: 4.8, fiber: 1.2, sodium: 15 },
  番茄: { cal: 20, p: 0.9, c: 4.2, f: 0.2, fiber: 1.2, sodium: 10 },
  西红柿: { cal: 20, p: 0.9, c: 4.2, f: 0.2, fiber: 1.2, sodium: 10 },
  黄瓜: { cal: 15, p: 0.8, c: 3.0, f: 0.1, fiber: 0.8, sodium: 5 },
  土豆: { cal: 77, p: 2.0, c: 17.5, f: 0.1, fiber: 1.8, sodium: 8 },
  西兰花: { cal: 34, p: 2.8, c: 6.6, f: 0.4, fiber: 2.6, sodium: 33 },
  芥蓝: { cal: 22, p: 2.2, c: 3.8, f: 0.3, fiber: 2.5, sodium: 45 },
  青菜: { cal: 18, p: 1.8, c: 2.8, f: 0.3, fiber: 1.8, sodium: 30 },
  上海青: { cal: 18, p: 1.8, c: 2.8, f: 0.3, fiber: 1.8, sodium: 30 },
  白菜: { cal: 17, p: 1.5, c: 3.2, f: 0.2, fiber: 1.2, sodium: 25 },
  菌菇: { cal: 26, p: 3.1, c: 4.3, f: 0.4, fiber: 2.1, sodium: 15 },
  香菇: { cal: 28, p: 2.2, c: 5.2, f: 0.3, fiber: 3.3, sodium: 12 },
  白玉菇: { cal: 24, p: 2.8, c: 4.5, f: 0.3, fiber: 2.4, sodium: 10 },
  金针菇: { cal: 32, p: 2.4, c: 6.0, f: 0.4, fiber: 2.7, sodium: 4 },
  米饭: { cal: 116, p: 2.6, c: 25.9, f: 0.3, fiber: 0.4, sodium: 2 },
  藜麦: { cal: 120, p: 4.4, c: 21.3, f: 1.9, fiber: 2.8, sodium: 7 },
  玉米: { cal: 96, p: 3.4, c: 21.0, f: 1.2, fiber: 2.4, sodium: 15 },
  胡萝卜: { cal: 41, p: 0.9, c: 9.6, f: 0.2, fiber: 2.8, sodium: 69 },
  牛油果: { cal: 160, p: 2.0, c: 8.5, f: 14.7, fiber: 6.7, sodium: 7, sugar: 0.7, vitaminA: 7, vitaminB1: 0.067, vitaminB2: 0.13, vitaminB6: 0.257, vitaminC: 10, vitaminE: 2.07, folate: 81, potassium: 485, magnesium: 29, calcium: 12 },
  洋葱: { cal: 40, p: 1.1, c: 9.3, f: 0.1, fiber: 1.7, sodium: 4 },
  彩椒: { cal: 26, p: 1.0, c: 6.0, f: 0.2, fiber: 2.1, sodium: 3 },
  苹果: { cal: 52, p: 0.3, c: 13.8, f: 0.2, fiber: 2.4, sodium: 1, sugar: 10.4, vitaminA: 3, vitaminB1: 0.017, vitaminB2: 0.026, vitaminB6: 0.041, vitaminC: 4.6, vitaminE: 0.18, folate: 3, potassium: 107, magnesium: 5, calcium: 6 },
  香蕉: { cal: 89, p: 1.1, c: 22.8, f: 0.3, fiber: 2.6, sodium: 1, sugar: 12.2, vitaminA: 3, vitaminB1: 0.031, vitaminB2: 0.073, vitaminB6: 0.367, vitaminC: 8.7, vitaminE: 0.1, folate: 20, potassium: 358, magnesium: 27, calcium: 5 },
  橙子: { cal: 47, p: 0.9, c: 11.8, f: 0.1, fiber: 2.4, sodium: 0, sugar: 9.4, vitaminA: 11, vitaminB1: 0.087, vitaminB2: 0.04, vitaminB6: 0.06, vitaminC: 53.2, vitaminE: 0.18, folate: 30, potassium: 181, magnesium: 10, calcium: 40 },
  草莓: { cal: 32, p: 0.7, c: 7.7, f: 0.3, fiber: 2, sodium: 1, sugar: 4.9, vitaminA: 1, vitaminB1: 0.024, vitaminB2: 0.022, vitaminB6: 0.047, vitaminC: 58.8, vitaminE: 0.29, folate: 24, potassium: 153, magnesium: 13, calcium: 16 },
  蓝莓: { cal: 57, p: 0.7, c: 14.5, f: 0.3, fiber: 2.4, sodium: 1, sugar: 10, vitaminA: 3, vitaminB1: 0.037, vitaminB2: 0.041, vitaminB6: 0.052, vitaminC: 9.7, vitaminE: 0.57, folate: 6, potassium: 77, magnesium: 6, calcium: 6 },
  西瓜: { cal: 30, p: 0.6, c: 7.6, f: 0.2, fiber: 0.4, sodium: 1, sugar: 6.2, vitaminA: 28, vitaminB1: 0.033, vitaminB2: 0.021, vitaminB6: 0.045, vitaminC: 8.1, vitaminE: 0.05, folate: 3, potassium: 112, magnesium: 10, calcium: 7 },
  葡萄: { cal: 69, p: 0.7, c: 18.1, f: 0.2, fiber: 0.9, sodium: 2, sugar: 15.5, vitaminA: 3, vitaminB1: 0.069, vitaminB2: 0.07, vitaminB6: 0.086, vitaminC: 3.2, vitaminE: 0.19, folate: 2, potassium: 191, magnesium: 7, calcium: 10 },
  猕猴桃: { cal: 61, p: 1.1, c: 14.7, f: 0.5, fiber: 3, sodium: 3, sugar: 9, vitaminA: 4, vitaminB1: 0.027, vitaminB2: 0.025, vitaminB6: 0.063, vitaminC: 92.7, vitaminE: 1.46, folate: 25, potassium: 312, magnesium: 17, calcium: 34 },
  芒果: { cal: 60, p: 0.8, c: 15, f: 0.4, fiber: 1.6, sodium: 1, sugar: 13.7, vitaminA: 54, vitaminB1: 0.028, vitaminB2: 0.038, vitaminB6: 0.119, vitaminC: 36.4, vitaminE: 0.9, folate: 43, potassium: 168, magnesium: 10, calcium: 11 },
  梨: { cal: 57, p: 0.4, c: 15.2, f: 0.1, fiber: 3.1, sodium: 1, sugar: 9.8, vitaminA: 1, vitaminB1: 0.012, vitaminB2: 0.026, vitaminB6: 0.029, vitaminC: 4.3, vitaminE: 0.12, folate: 7, potassium: 116, magnesium: 7, calcium: 9 },
  桃: { cal: 39, p: 0.9, c: 9.5, f: 0.3, fiber: 1.5, sodium: 0, sugar: 8.4, vitaminA: 16, vitaminB1: 0.024, vitaminB2: 0.031, vitaminB6: 0.025, vitaminC: 6.6, vitaminE: 0.73, folate: 4, potassium: 190, magnesium: 9, calcium: 6 },
  火龙果: { cal: 60, p: 1.1, c: 13, f: 0.4, fiber: 3, sodium: 0, sugar: 8, vitaminA: 0, vitaminB1: 0.03, vitaminB2: 0.04, vitaminB6: 0.05, vitaminC: 3, vitaminE: 0.1, folate: 0, potassium: 220, magnesium: 30, calcium: 10 },
  菠萝: { cal: 50, p: 0.5, c: 13.1, f: 0.1, fiber: 1.4, sodium: 1, sugar: 9.9, vitaminA: 3, vitaminB1: 0.079, vitaminB2: 0.032, vitaminB6: 0.112, vitaminC: 47.8, vitaminE: 0.02, folate: 18, potassium: 109, magnesium: 12, calcium: 13 },
  哈密瓜: { cal: 34, p: 0.8, c: 8.2, f: 0.2, fiber: 0.9, sodium: 16, sugar: 7.9, vitaminA: 169, vitaminB1: 0.041, vitaminB2: 0.019, vitaminB6: 0.072, vitaminC: 36.7, vitaminE: 0.05, folate: 21, potassium: 267, magnesium: 12, calcium: 9 },
  车厘子: { cal: 63, p: 1.1, c: 16, f: 0.2, fiber: 2.1, sodium: 0, sugar: 12.8, vitaminA: 3, vitaminB1: 0.027, vitaminB2: 0.033, vitaminB6: 0.049, vitaminC: 7, vitaminE: 0.07, folate: 4, potassium: 222, magnesium: 11, calcium: 13 },
  圣女果: { cal: 18, p: 0.9, c: 3.9, f: 0.2, fiber: 1.2, sodium: 5, sugar: 2.6, vitaminA: 42, vitaminB1: 0.037, vitaminB2: 0.019, vitaminB6: 0.08, vitaminC: 13.7, vitaminE: 0.54, folate: 15, potassium: 237, magnesium: 11, calcium: 10 },
  柠檬: { cal: 29, p: 1.1, c: 9.3, f: 0.3, fiber: 2.8, sodium: 2, sugar: 2.5, vitaminA: 1, vitaminB1: 0.04, vitaminB2: 0.02, vitaminB6: 0.08, vitaminC: 53, vitaminE: 0.15, folate: 11, potassium: 138, magnesium: 8, calcium: 26 },
  面条: { cal: 137, p: 4.5, c: 28.0, f: 0.9, fiber: 1.2, sodium: 30 },
};

const LOOKUP_KEYS = Object.keys(FOOD_NUTRITION_LOOKUP).sort((a, b) => b.length - a.length);

/** 常见计数单位的估算重量（g） */
const UNIT_WEIGHT: Record<string, number> = {
  个: 80,
  只: 60,
  条: 200,
  根: 100,
  枚: 50,
  瓣: 5,
  盒: 250,
  块: 60,
  把: 40,
  片: 10,
  勺: 10,
  汤匙: 12,
  茶匙: 5,
  碗: 200,
  杯: 240,
};

/** 没有写清克数时，按食材角色给出默认用量（g） */
const DEFAULT_WEIGHT_BY_ROLE: Record<'main' | 'seasoning' | 'garnish', number> = {
  main: 150,
  seasoning: 40,
  garnish: 20,
};

/**
 * 常见食材按“个/只/枚”计算时的单件重量（g）。
 * 不区分食材的通用单位重量会把「2 个土豆」算成 160g、「3 个鸭蛋」算成 180g，
 * 导致蛋白质被严重低估，所以这里优先按食材匹配。
 */
const PIECE_WEIGHT: Record<string, number> = {
  咸蛋黄: 15,
  鹌鹑蛋: 10,
  鸭蛋: 65,
  鸡蛋: 55,
  鹅蛋: 120,
  土豆: 200,
  番茄: 150,
  西红柿: 150,
  洋葱: 150,
  胡萝卜: 120,
  玉米: 200,
  牛油果: 150,
  青椒: 80,
  彩椒: 100,
  黄瓜: 150,
  茄子: 200,
  苹果: 180,
  香蕉: 120,
  橙子: 150,
  橙: 150,
  梨: 200,
  桃: 150,
  猕猴桃: 80,
  芒果: 200,
  火龙果: 300,
  菠萝: 1000,
  哈密瓜: 1000,
  柠檬: 100,
  车厘子: 8,
  圣女果: 15,
};

const PIECE_KEYS = Object.keys(PIECE_WEIGHT).sort((a, b) => b.length - a.length);

function pieceWeightFor(foodName: string): number | null {
  const text = (foodName || '').toLowerCase();
  for (const key of PIECE_KEYS) {
    if (text.includes(key.toLowerCase())) return PIECE_WEIGHT[key];
  }
  return null;
}

/** 从“600g / 1条(约500g) / 300ml / 3枚”里解析出克数 */
export function parseAmountGrams(amount: string | undefined, foodName = ''): number | null {
  const text = (amount || '').toLowerCase();
  if (!text) return null;

  const kg = /(\d+(?:\.\d+)?)\s*(kg|千克)/i.exec(text);
  if (kg) return parseFloat(kg[1]) * 1000;

  const gram = /(\d+(?:\.\d+)?)\s*(g|克|ml|毫升)/i.exec(text);
  if (gram) return parseFloat(gram[1]);

  const liter = /(\d+(?:\.\d+)?)\s*(l|升)(?![a-z])/i.exec(text);
  if (liter) return parseFloat(liter[1]) * 1000;

  const counted = /(\d+(?:\.\d+)?)\s*(个|只|条|根|枚|瓣|盒|块|把|片|勺|汤匙|茶匙|碗|杯)/.exec(text);
  if (counted) {
    const count = parseFloat(counted[1]);
    const unit = counted[2];
    const pieceWeight = pieceWeightFor(foodName);
    if (pieceWeight) return count * pieceWeight;
    return count * (UNIT_WEIGHT[unit] ?? 80);
  }
  return null;
}

function matchFood(name: string): FoodNutrition | null {
  const text = (name || '').toLowerCase();
  for (const key of LOOKUP_KEYS) {
    if (text.includes(key.toLowerCase())) return FOOD_NUTRITION_LOOKUP[key];
  }
  return null;
}

/** 按菜名 / 分类兜底的热量模型 */
function fallbackByCategory(name: string, category?: DishCategory): NutritionInfo {
  const n = name || '';
  if (n.includes('蛋')) {
    return { calories: 210, protein: 14, carbs: 8, fat: 12.5, fiber: 1.5, sodium: 450 };
  }
  if (n.includes('肉') || n.includes('排骨') || n.includes('牛') || n.includes('鸡') || n.includes('羊') || category === 'meat') {
    return { calories: 380, protein: 28.5, carbs: 10, fat: 26, fiber: 1.2, sodium: 580 };
  }
  if (n.includes('鱼') || n.includes('虾') || n.includes('蟹') || n.includes('海鲜') || category === 'seafood') {
    return { calories: 220, protein: 32, carbs: 4, fat: 7.5, fiber: 0.8, sodium: 480 };
  }
  if (n.includes('汤') || n.includes('煲') || n.includes('羹') || category === 'soup') {
    return { calories: 160, protein: 12, carbs: 14, fat: 6.5, fiber: 2.5, sodium: 420 };
  }
  if (n.includes('面') || n.includes('饭') || n.includes('饺') || n.includes('包') || n.includes('粥') || category === 'staple') {
    return { calories: 320, protein: 8, carbs: 55, fat: 7, fiber: 2, sodium: 520 };
  }
  if (category === 'fruit' || /苹果|香蕉|橙|梨|桃|葡萄|草莓|蓝莓|西瓜|猕猴桃|芒果|火龙果|菠萝|哈密瓜|车厘子|圣女果|柠檬/.test(n)) {
    return {
      calories: 55, protein: 0.8, carbs: 13, fat: 0.3, fiber: 2.2, sodium: 1,
      sugar: 9.5, vitaminA: 8, vitaminB1: 0.03, vitaminB2: 0.03, vitaminB6: 0.06,
      vitaminC: 20, vitaminE: 0.3, folate: 12, potassium: 180, magnesium: 10, calcium: 10,
    };
  }
  if (n.includes('沙拉') || n.includes('轻食') || n.includes('减脂') || category === 'light') {
    return { calories: 260, protein: 24, carbs: 18, fat: 9, fiber: 6, sodium: 380 };
  }
  return { calories: 110, protein: 4.5, carbs: 9, fat: 5.2, fiber: 3.6, sodium: 320 };
}

/**
 * 依据食材清单估算一整盘菜的营养。
 * 前端“自动重算”按钮与服务端写入校验共用同一套算法。
 */
export function estimateNutritionLocally(
  dishName: string,
  ingredients: Array<Pick<Ingredient, 'name' | 'amount' | 'category'>>,
  category?: DishCategory
): NutritionInfo {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;
  let sodium = 0;
  let sugar = 0;
  let vitaminA = 0;
  let vitaminB1 = 0;
  let vitaminB2 = 0;
  let vitaminB6 = 0;
  let vitaminC = 0;
  let vitaminE = 0;
  let folate = 0;
  let potassium = 0;
  let magnesium = 0;
  let calcium = 0;
  let matched = 0;

  for (const ing of ingredients || []) {
    const food = matchFood(ing?.name || '');
    if (!food) continue;

    const grams = parseAmountGrams(ing.amount, ing.name) ?? DEFAULT_WEIGHT_BY_ROLE[ing.category ?? 'main'];
    const factor = Math.min(6, Math.max(0.05, grams / 100));

    calories += food.cal * factor;
    protein += food.p * factor;
    carbs += food.c * factor;
    fat += food.f * factor;
    fiber += food.fiber * factor;
    sodium += food.sodium * factor;
    sugar += (food.sugar ?? 0) * factor;
    vitaminA += (food.vitaminA ?? 0) * factor;
    vitaminB1 += (food.vitaminB1 ?? 0) * factor;
    vitaminB2 += (food.vitaminB2 ?? 0) * factor;
    vitaminB6 += (food.vitaminB6 ?? 0) * factor;
    vitaminC += (food.vitaminC ?? 0) * factor;
    vitaminE += (food.vitaminE ?? 0) * factor;
    folate += (food.folate ?? 0) * factor;
    potassium += (food.potassium ?? 0) * factor;
    magnesium += (food.magnesium ?? 0) * factor;
    calcium += (food.calcium ?? 0) * factor;
    matched += 1;
  }

  if (matched === 0 || calories < 60) {
    const fb = fallbackByCategory(dishName, category);
    calories = Math.max(calories, fb.calories);
    protein = Math.max(protein, fb.protein);
    carbs = Math.max(carbs, fb.carbs);
    fat = Math.max(fat, fb.fat);
    fiber = Math.max(fiber, fb.fiber);
    sodium = Math.max(sodium, fb.sodium);
    sugar = Math.max(sugar, fb.sugar ?? 0);
    vitaminA = Math.max(vitaminA, fb.vitaminA ?? 0);
    vitaminB1 = Math.max(vitaminB1, fb.vitaminB1 ?? 0);
    vitaminB2 = Math.max(vitaminB2, fb.vitaminB2 ?? 0);
    vitaminB6 = Math.max(vitaminB6, fb.vitaminB6 ?? 0);
    vitaminC = Math.max(vitaminC, fb.vitaminC ?? 0);
    vitaminE = Math.max(vitaminE, fb.vitaminE ?? 0);
    folate = Math.max(folate, fb.folate ?? 0);
    potassium = Math.max(potassium, fb.potassium ?? 0);
    magnesium = Math.max(magnesium, fb.magnesium ?? 0);
    calcium = Math.max(calcium, fb.calcium ?? 0);
  }

  return {
    calories: Math.round(clamp(calories, 0, 3000)),
    protein: round1(clamp(protein, 0, 300)),
    carbs: round1(clamp(carbs, 0, 500)),
    fat: round1(clamp(fat, 0, 300)),
    fiber: round1(clamp(fiber, 0, 100)),
    sodium: Math.round(clamp(sodium, 0, 10000)),
    sugar: round1(clamp(sugar, 0, 500)),
    vitaminA: Math.round(clamp(vitaminA, 0, 5000)),
    vitaminB1: round1(clamp(vitaminB1, 0, 50)),
    vitaminB2: round1(clamp(vitaminB2, 0, 50)),
    vitaminB6: round1(clamp(vitaminB6, 0, 50)),
    vitaminC: round1(clamp(vitaminC, 0, 2000)),
    vitaminE: round1(clamp(vitaminE, 0, 200)),
    folate: Math.round(clamp(folate, 0, 2000)),
    potassium: Math.round(clamp(potassium, 0, 10000)),
    magnesium: Math.round(clamp(magnesium, 0, 2000)),
    calcium: Math.round(clamp(calcium, 0, 5000)),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** 三大供能比（%），供 UI 复用 */
export function macroPercentages(n: NutritionInfo): { protein: number; carbs: number; fat: number } {
  const p = Math.max(0, n.protein) * 4;
  const c = Math.max(0, n.carbs) * 4;
  const f = Math.max(0, n.fat) * 9;
  const total = Math.max(1, p + c + f);
  return {
    protein: Math.round((p / total) * 100),
    carbs: Math.round((c / total) * 100),
    fat: Math.round((f / total) * 100),
  };
}
