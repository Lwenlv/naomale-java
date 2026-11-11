/**
 * AI 能力（前端入口）
 *
 * - 配置了 DeepSeek Key 时：请求由服务端代理（密钥不会下发到浏览器）；
 * - 未配置或调用失败时：自动降级到本地启发式解析 + 本地营养规则引擎，
 *   保证离线也能录菜、也能拿到营养点评。
 */
import type { AIRecipeDraft, Dish, DishCategory, Ingredient, NutritionInfo, OrderItem } from '../types';
import { estimateNutritionLocally } from '../utils/nutrition';
import { getSettings, parseRecipeWithServer, requestNutritionAdvice } from './data';

export { estimateNutritionLocally };

export type AIParsedRecipe = AIRecipeDraft;

export interface AIParseResult extends AIRecipeDraft {
  /** 非致命提示，例如“AI 调用失败，已使用本地解析” */
  warning?: string;
}

const hasAIKey = (): boolean => Boolean(getSettings()?.ai.hasKey);

/** 解析菜谱文字/图片：接入 AI 后只用 AI；未接入时才走文字基础识别 */
export async function parseRecipeWithAI(text: string, imageDataUrl?: string): Promise<AIParseResult> {
  if (hasAIKey()) {
    // 不做本地兜底，失败时由界面提示错误，避免把本地结果当成 AI 结果
    return parseRecipeWithServer(text, imageDataUrl);
  }
  if (imageDataUrl) {
    throw new Error('图片识别需要先在「设置」中配置 DeepSeek API Key');
  }
  return {
    ...parseLocally(text),
    warning:
      '当前未配置 AI：本次使用基础识别（文字只在浏览器内处理）。配置 DeepSeek 后可获得更准确的结构化结果。',
  };
}

/** 生成整餐营养点评：优先 DeepSeek，失败则本地临床规则引擎 */
export async function generateAINutritionAdvice(
  orderItems: OrderItem[],
  dinerCount: number = 3
): Promise<string> {
  const diners = Math.max(1, dinerCount);
  const totals = sumNutrition(orderItems);

  if (hasAIKey()) {
    try {
      return await requestNutritionAdvice({
        dishNames: orderItems.map((item) => item.dish.name),
        dinerCount: diners,
        totals,
      });
    } catch (error: any) {
      console.warn('[AI] DeepSeek 营养点评失败，已使用基础点评：', error?.message ?? error);
    }
  }

  return ruleBasedAdvice(orderItems, diners, totals);
}

export function sumNutrition(orderItems: OrderItem[]): NutritionInfo {
  return orderItems.reduce<NutritionInfo>(
    (acc, item) => {
      const n = item.dish.nutrition;
      const qty = item.quantity || 1;
      return {
        calories: acc.calories + (n?.calories || 0) * qty,
        protein: acc.protein + (n?.protein || 0) * qty,
        carbs: acc.carbs + (n?.carbs || 0) * qty,
        fat: acc.fat + (n?.fat || 0) * qty,
        fiber: acc.fiber + (n?.fiber || 0) * qty,
        sodium: acc.sodium + (n?.sodium || 0) * qty,
        sugar: (acc.sugar || 0) + (n?.sugar || 0) * qty,
        vitaminA: (acc.vitaminA || 0) + (n?.vitaminA || 0) * qty,
        vitaminB1: (acc.vitaminB1 || 0) + (n?.vitaminB1 || 0) * qty,
        vitaminB2: (acc.vitaminB2 || 0) + (n?.vitaminB2 || 0) * qty,
        vitaminB6: (acc.vitaminB6 || 0) + (n?.vitaminB6 || 0) * qty,
        vitaminC: (acc.vitaminC || 0) + (n?.vitaminC || 0) * qty,
        vitaminE: (acc.vitaminE || 0) + (n?.vitaminE || 0) * qty,
        folate: (acc.folate || 0) + (n?.folate || 0) * qty,
        potassium: (acc.potassium || 0) + (n?.potassium || 0) * qty,
        magnesium: (acc.magnesium || 0) + (n?.magnesium || 0) * qty,
        calcium: (acc.calcium || 0) + (n?.calcium || 0) * qty,
      };
    },
    {
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0,
      sugar: 0, vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB6: 0,
      vitaminC: 0, vitaminE: 0, folate: 0, potassium: 0, magnesium: 0, calcium: 0,
    }
  );
}

/* ------------------------------------------------------------------ */
/* 本地启发式菜谱解析                                                  */
/* ------------------------------------------------------------------ */

function inferCategory(dishName: string): DishCategory {
  if (/鱼|虾|蟹|海鲜|鲈/.test(dishName)) return 'seafood';
  if (/肉|排骨|鸡|牛|羊|翅/.test(dishName)) return 'meat';
  if (/汤|煲|羹/.test(dishName)) return 'soup';
  if (/面|饭|饺|包|粥|粉/.test(dishName)) return 'staple';
  if (/沙拉|减脂|轻食|能量碗/.test(dishName)) return 'light';
  if (/苹果|香蕉|橙|梨|桃|葡萄|草莓|蓝莓|西瓜|猕猴桃|芒果|火龙果|菠萝|哈密瓜|车厘子|圣女果|柠檬|水果|果切|果盘/.test(dishName)) return 'fruit';
  return 'veggie';
}

function parseLocally(text: string): AIParsedRecipe {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLine = lines[0] || '美味家常料理';
  const dishName = firstLine.replace(/^[#0-9.\s、]+/, '').slice(0, 24) || '美味家常料理';

  const ingredients: Ingredient[] = [];
  const steps: AIRecipeDraft['steps'] = [];

  let inIngredients = false;
  let inSteps = false;

  for (const line of lines) {
    if (line.includes('食材') || line.includes('用料') || line.includes('主料') || line.includes('配料')) {
      inIngredients = true;
      inSteps = false;
      continue;
    }
    if (line.includes('做法') || line.includes('步骤') || line.includes('烹饪') || line.includes('过程')) {
      inSteps = true;
      inIngredients = false;
      continue;
    }

    if (inIngredients && !inSteps) {
      const parts = line.split(/[:：\s\t,，、]+/).filter(Boolean);
      if (parts.length >= 2) {
        ingredients.push({ name: parts[0], amount: parts.slice(1).join(' '), category: 'main' });
      } else if (parts[0]) {
        ingredients.push({ name: parts[0], amount: '适量', category: 'main' });
      }
    } else if (inSteps) {
      const stepText = line.replace(/^[0-9.\s、]+/, '');
      if (stepText) {
        steps.push({
          order: steps.length + 1,
          title: `步骤 ${steps.length + 1}`,
          instruction: stepText,
        });
      }
    }
  }

  if (ingredients.length === 0) {
    const parts = text.split(/[，,、\n]+/).map((part) => part.trim());
    for (const part of parts.slice(0, 6)) {
      if (part && part.length < 15 && !part.includes('做法')) {
        ingredients.push({ name: part, amount: '适量', category: 'main' });
      }
    }
  }

  if (steps.length === 0) {
    steps.push(
      { order: 1, title: '洗切备料', instruction: '将主要食材洗净、改刀切块，沥干水分备用。' },
      { order: 2, title: '下锅烹调', instruction: '热锅起油，下入食材慢煎或大火翻炒至断生上色。' },
      { order: 3, title: '调味出锅', instruction: '加入适量调味料翻匀焖煮收汁，装盘享用。' }
    );
  }

  const category = inferCategory(dishName);
  const safeIngredients = ingredients.length > 0 ? ingredients : [{ name: dishName, amount: '适量', category: 'main' as const }];

  return {
    name: dishName,
    category,
    cuisine: '家常风味',
    prepTime: 12,
    cookTime: 15,
    difficulty: 'easy',
    estimatedPrice: 20,
    servings: 2,
    description: `精选家常食材烹制的一道${dishName}，原汁原味，烹饪简单，家庭常伴。`,
    ingredients: safeIngredients,
    steps,
    tags: ['家庭常备', '快手易做', '原汁原味'],
    nutrition: estimateNutritionLocally(dishName, safeIngredients, category),
  };
}

/* ------------------------------------------------------------------ */
/* 本地营养规则引擎                                                    */
/* ------------------------------------------------------------------ */

function ruleBasedAdvice(orderItems: OrderItem[], diners: number, totals: NutritionInfo): string {
  const perCapitaCal = Math.round(totals.calories / diners);
  const perCapitaProtein = Math.round((totals.protein / diners) * 10) / 10;
  const perFiber = Math.round(((totals.fiber || 0) / diners) * 10) / 10;
  const perVitaminC = Math.round(((totals.vitaminC || 0) / diners) * 10) / 10;
  const perCalcium = Math.round((totals.calcium || 0) / diners);

  const meatCount = orderItems.filter(
    (item) => item.dish.category === 'meat' || item.dish.category === 'seafood'
  ).length;
  const veggieCount = orderItems.filter(
    (item) => item.dish.category === 'veggie' || item.dish.category === 'light' || item.dish.category === 'fruit'
  ).length;
  const missing: string[] = [];
  if (perCapitaProtein < 20) missing.push('蛋白质');
  if (veggieCount === 0) missing.push('蔬菜或水果');
  if (perFiber < 5) missing.push('膳食纤维');
  if (perVitaminC < 30) missing.push('维生素 C');
  if (perCalcium < 200) missing.push('钙');

  const structure = `本餐结构：人均约 ${perCapitaCal} kcal、蛋白质 ${perCapitaProtein}g；荤菜 ${meatCount} 道、蔬果 ${veggieCount} 道。`;
  if (missing.length === 0) {
    return `${structure}\n可能缺少：整体结构较均衡，没有明显短板。\n建议补充：保持当前搭配，注意控盐即可。`;
  }
  return `${structure}\n可能缺少：${missing.join('、')}。\n建议补充：可以加一份深色蔬菜、水果或豆制品；如果蛋白质偏低，优先补鸡蛋、鱼虾或豆制品。`;
}

/** 供组件做“按食材重算”的薄封装，便于统一类型 */
export function recalculateNutrition(dishName: string, ingredients: Ingredient[], category: DishCategory): NutritionInfo {
  return estimateNutritionLocally(dishName, ingredients, category);
}

export function dishNutrition(dish: Dish): NutritionInfo {
  return dish.nutrition;
}
