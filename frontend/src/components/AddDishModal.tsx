import React from 'react';
import { X, Sparkles, Plus, Trash2, Upload, Loader2, Wand2, Calculator, AlertTriangle, CheckCircle2, ImagePlus } from 'lucide-react';
import { Dish, DishCategory, Difficulty, Ingredient, CookingStep, NutritionInfo } from '../types';
import { parseRecipeWithAI, estimateNutritionLocally } from '../services/ai';
import { estimateNutritionWithAI, uploadImage, fileToDataUrl, optimizeImage, uploadImageDataUrl } from '../services/data';
import { NumberField } from './NumberField';
import { ImageLightbox } from './ImageLightbox';
import { ImageCropper } from './ImageCropper';

interface AddDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDish: (dish: Dish) => void;
  editingDish?: Dish | null;
  hasAIKey?: boolean;
  aiModel?: string;
  onOpenSettings?: () => void;
}

const DEFAULT_COVER = '/images/dish-placeholder.svg';

const DEFAULT_NUTRITION: NutritionInfo = {
  calories: 280,
  protein: 22,
  carbs: 15,
  fat: 14,
  fiber: 2.5,
  sodium: 480,
  sugar: 0,
  vitaminA: 0,
  vitaminB1: 0,
  vitaminB2: 0,
  vitaminB6: 0,
  vitaminC: 0,
  vitaminE: 0,
  folate: 0,
  potassium: 0,
  magnesium: 0,
  calcium: 0,
};

const MICRO_FIELDS: Array<{ key: keyof NutritionInfo; label: string; step: number }> = [
  { key: 'sugar', label: '糖 (g)', step: 0.1 },
  { key: 'vitaminA', label: '维A (μg)', step: 1 },
  { key: 'vitaminB1', label: '维B1 (mg)', step: 0.01 },
  { key: 'vitaminB2', label: '维B2 (mg)', step: 0.01 },
  { key: 'vitaminB6', label: '维B6 (mg)', step: 0.01 },
  { key: 'vitaminC', label: '维C (mg)', step: 0.1 },
  { key: 'vitaminE', label: '维E (mg)', step: 0.01 },
  { key: 'folate', label: '叶酸 (μg)', step: 1 },
  { key: 'potassium', label: '钾 (mg)', step: 1 },
  { key: 'magnesium', label: '镁 (mg)', step: 1 },
  { key: 'calcium', label: '钙 (mg)', step: 1 },
];

export const AddDishModal: React.FC<AddDishModalProps> = ({
  isOpen,
  onClose,
  onSaveDish,
  editingDish,
  hasAIKey = false,
  aiModel = 'deepseek-flash',
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = React.useState<'ai' | 'manual'>('ai');
  const [aiInputText, setAiInputText] = React.useState('');
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiNotice, setAiNotice] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isAiNutritionLoading, setIsAiNutritionLoading] = React.useState(false);
  const [lightboxSrc, setLightboxSrc] = React.useState<string | null>(null);
  const [cropFile, setCropFile] = React.useState<File | null>(null);
  const [aiImageDataUrl, setAiImageDataUrl] = React.useState<string | null>(null);
  const [aiImageUrl, setAiImageUrl] = React.useState<string | null>(null);
  const [aiImageName, setAiImageName] = React.useState('');
  const [isAiImageLoading, setIsAiImageLoading] = React.useState(false);

  // Form states
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState<DishCategory>('meat');
  const [cuisine, setCuisine] = React.useState('家常融合');
  const [prepTime, setPrepTime] = React.useState(15);
  const [cookTime, setCookTime] = React.useState(20);
  const [difficulty, setDifficulty] = React.useState<Difficulty>('easy');
  const [estimatedPrice, setEstimatedPrice] = React.useState(25);
  const [servings, setServings] = React.useState(3);
  const [coverImage, setCoverImage] = React.useState(DEFAULT_COVER);
  const [description, setDescription] = React.useState('');
  const [tags, setTags] = React.useState('家常菜, 营养美味');

  const [ingredients, setIngredients] = React.useState<Ingredient[]>([
    { name: '', amount: '', category: 'main' },
  ]);

  const [steps, setSteps] = React.useState<CookingStep[]>([
    { order: 1, title: '备料洗切', instruction: '' },
    { order: 2, title: '热锅烹饪', instruction: '' },
  ]);

  const [nutrition, setNutrition] = React.useState<NutritionInfo>({ ...DEFAULT_NUTRITION });

  // 打开“录新菜”时重置表单，避免上一次的残留内容误导录入
  React.useEffect(() => {
    if (!isOpen || editingDish) return;
    setName('');
    setCategory('meat');
    setCuisine('家常融合');
    setPrepTime(15);
    setCookTime(20);
    setDifficulty('easy');
    setEstimatedPrice(25);
    setServings(3);
    setCoverImage(DEFAULT_COVER);
    setDescription('');
    setTags('家常菜, 营养美味');
    setIngredients([{ name: '', amount: '', category: 'main' }]);
    setSteps([
      { order: 1, title: '备料洗切', instruction: '' },
      { order: 2, title: '热锅烹饪', instruction: '' },
    ]);
    setNutrition({ ...DEFAULT_NUTRITION });
    setAiInputText('');
    setAiError(null);
    setAiNotice(null);
    setAiImageDataUrl(null);
    setAiImageUrl(null);
    setAiImageName('');
    setActiveTab('ai');
  }, [isOpen, editingDish]);

  // Load editing dish
  React.useEffect(() => {
    if (editingDish) {
      setName(editingDish.name);
      setCategory(editingDish.category);
      setCuisine(editingDish.cuisine);
      setPrepTime(editingDish.prepTime);
      setCookTime(editingDish.cookTime);
      setDifficulty(editingDish.difficulty);
      setEstimatedPrice(editingDish.estimatedPrice);
      setServings(editingDish.servings);
      setCoverImage(editingDish.coverImage || DEFAULT_COVER);
      setDescription(editingDish.description);
      setTags(editingDish.tags.join(', '));
      setIngredients(editingDish.ingredients.length > 0 ? editingDish.ingredients : [{ name: '', amount: '', category: 'main' }]);
      setSteps(editingDish.steps.length > 0 ? editingDish.steps : [{ order: 1, title: '步骤1', instruction: '' }]);
      setNutrition(editingDish.nutrition);
      setActiveTab('manual');
    }
  }, [editingDish]);

  if (!isOpen) return null;

  // AI Parse Handler
  const handleAIImagePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAiError('请选择 JPG / PNG / WebP 图片');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setAiError('图片不能超过 30MB');
      return;
    }
    setIsAiImageLoading(true);
    setAiError(null);
    try {
      const optimized = await optimizeImage(file);
      const dataUrl = await fileToDataUrl(optimized);
      setAiImageDataUrl(dataUrl);
      setAiImageName(optimized.name);
      try {
        const url = await uploadImageDataUrl(dataUrl, optimized.name);
        setAiImageUrl(url);
      } catch {
        // 自动设为封面失败不阻塞识谱，用户可以手动上传封面
      }
    } catch (error: any) {
      setAiError(error?.message || '读取图片失败');
    } finally {
      setIsAiImageLoading(false);
    }
  };

  const handleAIParse = async () => {
    if (!aiInputText.trim() && !aiImageDataUrl) {
      setAiError('请先输入菜谱文字，或上传一张菜谱图片');
      return;
    }
    if (aiImageDataUrl && !hasAIKey) {
      setAiError('图片识别需要先在「设置」中配置 DeepSeek API Key');
      return;
    }
    setIsAiLoading(true);
    setAiError(null);
    setAiNotice(null);

    try {
      const parsed = await parseRecipeWithAI(aiInputText, aiImageDataUrl || undefined);
      setName(parsed.name || '自创美味料理');
      setCategory(parsed.category || 'meat');
      setCuisine(parsed.cuisine || '家常风味');
      setPrepTime(parsed.prepTime || 15);
      setCookTime(parsed.cookTime || 20);
      setDifficulty(parsed.difficulty || 'easy');
      setEstimatedPrice(parsed.estimatedPrice || 25);
      setServings(parsed.servings || 3);
      setDescription(parsed.description || '精心制作的家常美味。');
      if (parsed.ingredients && parsed.ingredients.length > 0) {
        setIngredients(parsed.ingredients);
      }
      if (parsed.steps && parsed.steps.length > 0) {
        setSteps(parsed.steps.map((step, index) => ({ ...step, order: step.order ?? index + 1 })));
      }
      if (parsed.tags && parsed.tags.length > 0) {
        setTags(parsed.tags.join(', '));
      }
      if (parsed.nutrition) {
        setNutrition(parsed.nutrition);
      }
      if (aiImageUrl) {
        setCoverImage(aiImageUrl);
      }
      if (parsed.warning) {
        setAiNotice(parsed.warning);
      } else if (hasAIKey) {
        setAiNotice('已由 DeepSeek 解析，营养数据为 AI 估算；可点「让 AI 重新估算」刷新。');
      }

      // 切换到手动复核页签
      setActiveTab('manual');
    } catch (err: any) {
      setAiError(err?.message || 'AI 解析遇到问题，请改用下方手动填录');
    } finally {
      setIsAiLoading(false);
    }
  };

  // 营养重算：接入 AI 时让 AI 算，未接入时才用本地食材表
  const handleRecalculateNutrition = async () => {
    if (hasAIKey) {
      const validIngredients = ingredients.filter((item) => item.name.trim().length > 0);
      if (!name.trim()) {
        setAiError('请先填写菜品名称，再让 AI 估算营养');
        return;
      }
      if (validIngredients.length === 0) {
        setAiError('请先填写食材，再让 AI 估算营养');
        return;
      }
      setIsAiNutritionLoading(true);
      setAiError(null);
      setAiNotice(null);
      try {
        const calculated = await estimateNutritionWithAI(name.trim(), validIngredients, servings);
        setNutrition(calculated);
        setAiNotice('营养数据已由 DeepSeek 根据食材重新估算。');
      } catch (error: any) {
        setAiError(error?.message || 'AI 营养估算失败，请检查网络或 API Key');
      } finally {
        setIsAiNutritionLoading(false);
      }
      return;
    }

    const calculated = estimateNutritionLocally(name, ingredients, category);
    setNutrition(calculated);
    setAiNotice('未配置 AI，已使用基础营养估算。');
  };

  const handleNutritionButton = () => {
    void handleRecalculateNutrition();
  };

  // Ingredient list operations
  const addIngredientRow = () => {
    setIngredients([...ingredients, { name: '', amount: '', category: 'main' }]);
  };

  const removeIngredientRow = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const updateIngredient = (idx: number, field: keyof Ingredient, value: string) => {
    const next = [...ingredients];
    next[idx] = { ...next[idx], [field]: value };
    setIngredients(next);
  };

  // Step operations
  const addStepRow = () => {
    setSteps([...steps, { order: steps.length + 1, title: `步骤 ${steps.length + 1}`, instruction: '' }]);
  };

  const removeStepRow = (idx: number) => {
    const next = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }));
    setSteps(next);
  };

  const updateStep = (idx: number, field: keyof CookingStep, value: any) => {
    const next = [...steps];
    next[idx] = { ...next[idx], [field]: value };
    setSteps(next);
  };

  // 选择图片后先裁剪，再上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAiError('请选择 JPG / PNG / WebP 图片');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setAiError('图片不能超过 30MB');
      return;
    }
    setCropFile(file);
  };

  const uploadCover = async (file: File) => {
    setCropFile(null);
    setIsUploading(true);
    setAiError(null);
    try {
      const url = await uploadImage(file);
      setCoverImage(url);
      setAiNotice('图片已保存到云端数据库，可长期访问。');
    } catch (error: any) {
      setAiError(error?.message || '图片上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cleanTags = tags
      .split(/[,，、]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const validIngredients = ingredients.filter((i) => i.name.trim().length > 0);
    const validSteps = steps.filter((s) => s.instruction.trim().length > 0);

    const newDish: Dish = {
      id: editingDish?.id || 'dish-' + Date.now(),
      name: name.trim(),
      category,
      cuisine: cuisine.trim() || '家常菜',
      prepTime: Number(prepTime) || 10,
      cookTime: Number(cookTime) || 15,
      difficulty,
      estimatedPrice: Number(estimatedPrice) || 20,
      servings: Number(servings) || 2,
      coverImage: coverImage || DEFAULT_COVER,
      description: description.trim() || `${name}，家常烹饪，美味适口。`,
      ingredients: validIngredients.length > 0 ? validIngredients : [{ name: name, amount: '适量' }],
      steps: validSteps.length > 0 ? validSteps : [{ order: 1, title: '制作', instruction: '按家常做法烹制。' }],
      nutrition,
      tags: cleanTags.length > 0 ? cleanTags : ['家常菜'],
      cookCount: editingDish?.cookCount || 0,
      createdAt: editingDish?.createdAt || new Date().toISOString(),
      isFavorite: editingDish?.isFavorite || false,
    };

    onSaveDish(newDish);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-stone-50 dark:bg-stone-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-800 my-auto flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="flex items-center gap-3">
            <span className="font-serif-title text-xl font-bold text-stone-900 dark:text-stone-100">
              {editingDish ? '编辑家常菜谱' : '录入家庭菜谱'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab switch */}
            {!editingDish && (
              <div className="flex items-center p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'ai'
                      ? 'bg-white dark:bg-stone-700 text-amber-800 dark:text-amber-300 shadow-sm'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>{hasAIKey ? 'AI 智能识谱' : '智能识谱'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'manual'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  手动填录
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              aria-label="关闭"
              title="关闭"
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {activeTab === 'ai' && !editingDish ? (
            /* AI Quick Parse Mode */
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border ${
                  hasAIKey
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/40'
                }`}
              >
                <div
                  className={`flex items-center gap-2 font-semibold text-sm mb-1 ${
                    hasAIKey ? 'text-emerald-900 dark:text-emerald-300' : 'text-amber-900 dark:text-amber-300'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 ${hasAIKey ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <span>
                    {hasAIKey
                      ? `已接入 DeepSeek（${aiModel}）：粘贴文字或上传菜谱图片，AI 自动提炼食材、耗时、做法与营养`
                      : '未配置 AI：文字可用基础识别，图片识别需先配置 DeepSeek'}
                  </span>
                </div>
                <p
                  className={`text-xs leading-relaxed ${
                    hasAIKey ? 'text-emerald-800/80 dark:text-emerald-400/80' : 'text-amber-800/80 dark:text-amber-400/80'
                  }`}
                >
                  {hasAIKey
                    ? '只把粘贴的文字和/或菜谱图片发给 DeepSeek，由服务端代理调用，API Key 不会下发到浏览器。'
                    : '无需联网：文字会在当前浏览器内完成基础识别与营养估算；图片识别需先配置 DeepSeek。'}
                </p>
                {!hasAIKey && onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900"
                  >
                    去设置里接入 DeepSeek
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/40 p-3">
                {aiImageDataUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-900 shrink-0">
                      <img src={aiImageDataUrl} alt="菜谱图片预览" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                        {aiImageName || '菜谱图片'}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        AI 会直接识别图片中的菜名、食材和做法
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <label className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold cursor-pointer hover:underline">
                          更换图片
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => void handleAIImagePick(e)}
                            disabled={isAiImageLoading}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setAiImageDataUrl(null);
                            setAiImageUrl(null);
                            setAiImageName('');
                          }}
                          className="text-[11px] text-stone-400 hover:text-rose-500 flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          移除
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                      {isAiImageLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 group-hover:text-amber-700 dark:group-hover:text-amber-400">
                        上传菜谱图片，直接让 AI 识别
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        支持 JPG / PNG / WebP，最大 8MB；也可只上传图片不填文字
                      </div>
                      {!hasAIKey && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                          图片识别需先在设置中配置 DeepSeek
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleAIImagePick(e)}
                      disabled={isAiImageLoading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300 block mb-2">
                  菜谱文字内容或食材清单（可选）
                </label>
                <textarea
                  rows={6}
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                  placeholder="可以粘贴菜谱文字，也可以只上传图片。例：
【蒜蓉粉丝蒸大虾】
大虾10只、粉丝一小把、大蒜1头、生抽2勺、蚝油1勺。
做法：粉丝温水泡软铺在盘底，大虾开背去虾线摆在粉丝上。热油爆炒金银蒜蓉淋生抽蚝油，铺在虾身上，水开大火蒸6分钟出锅淋热油。"
                  className="w-full text-xs sm:text-sm rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 p-4 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              {aiError && (
                <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{aiError}</span>
                </div>
              )}

              {aiNotice && (
                <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{aiNotice}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 underline"
                >
                  跳过，直接手动填写
                </button>

                <button
                  type="button"
                  disabled={isAiLoading || isAiImageLoading || (!aiInputText.trim() && !aiImageDataUrl)}
                  onClick={handleAIParse}
                  className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
                >
                  {isAiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{hasAIKey ? (aiImageDataUrl ? 'AI 正在识别图片...' : 'AI 正在结构化提炼中...') : '正在识别...'}</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>{hasAIKey ? '开始 AI 解析' : '开始识别'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Manual / Review Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                    菜品名称 *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="如：香菇滑鸡煲"
                    className="w-full text-xs sm:text-sm rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3.5 py-2 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                    菜品分类
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DishCategory)}
                    className="w-full text-xs sm:text-sm rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3.5 py-2 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="meat">硬菜禽肉 (Meat & Poultry)</option>
                    <option value="seafood">水产海鲜 (Fish & Seafood)</option>
                    <option value="veggie">清爽素菜 (Vegetables)</option>
                    <option value="soup">养生靓汤 (Soups & Stews)</option>
                    <option value="light">减脂轻食 (Salad & Low-Cal)</option>
                    <option value="fruit">水果 (Fruit)</option>
                    <option value="staple">主食面点 (Staple & Grain)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                    风味 / 菜系
                  </label>
                  <input
                    type="text"
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    placeholder="如：广式清蒸、川香小炒"
                    className="w-full text-xs sm:text-sm rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3.5 py-2 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                    预估单份食材成本 (元)
                  </label>
                  <NumberField
                    min={1}
                    step={1}
                    value={estimatedPrice}
                    onChange={setEstimatedPrice}
                    ariaLabel="预估单份食材成本"
                    className="w-full text-xs sm:text-sm rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3.5 py-2 text-stone-900 dark:text-stone-100 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                    准备耗时 (分钟)
                  </label>
                  <NumberField
                    min={1}
                    step={1}
                    value={prepTime}
                    onChange={setPrepTime}
                    ariaLabel="准备耗时"
                    className="w-full text-xs sm:text-sm rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3.5 py-2 text-stone-900 dark:text-stone-100 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                    烹饪耗时 (分钟)
                  </label>
                  <NumberField
                    min={1}
                    step={1}
                    value={cookTime}
                    onChange={setCookTime}
                    ariaLabel="烹饪耗时"
                    className="w-full text-xs sm:text-sm rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3.5 py-2 text-stone-900 dark:text-stone-100 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                    烹饪难度
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="w-full text-xs sm:text-sm rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3.5 py-2 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="easy">新手快手 (Easy)</option>
                    <option value="medium">家常熟练 (Medium)</option>
                    <option value="hard">功夫名菜 (Hard)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                    建议就餐人数
                  </label>
                  <NumberField
                    min={1}
                    step={1}
                    value={servings}
                    onChange={setServings}
                    ariaLabel="建议就餐人数"
                    className="w-full text-xs sm:text-sm rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3.5 py-2 text-stone-900 dark:text-stone-100 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-2">
                  菜品图片（可选）
                </label>

                {/* 当前封面预览：点击查看大图 */}
                <div className="relative mb-3 aspect-[16/9] w-full max-w-md rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 group">
                  <img
                    src={coverImage || DEFAULT_COVER}
                    alt="当前菜品图片预览"
                    referrerPolicy="no-referrer"
                    onClick={() => setLightboxSrc(coverImage || DEFAULT_COVER)}
                    className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-2 bg-gradient-to-t from-black/70 to-transparent">
                    <span className="text-[10px] text-white/90">
                      {coverImage === DEFAULT_COVER ? '默认占位图' : '当前图片'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLightboxSrc(coverImage || DEFAULT_COVER)}
                      className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-[11px] font-semibold text-white transition-colors"
                    >
                      查看大图
                    </button>
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white text-xs font-semibold gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      图片正在上传…
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isUploading
                        ? 'bg-stone-100 dark:bg-stone-800 text-stone-400 cursor-wait'
                        : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 cursor-pointer'
                    }`}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 text-amber-600 animate-spin" /> : <Upload className="w-4 h-4 text-amber-600" />}
                    <span>{isUploading ? '图片上传中…' : '上传菜品照片'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleImageUpload(e)}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-stone-400">
                    支持 JPG / PNG / WebP，最大 8MB，上传后保存到云端数据库
                  </span>
                </div>

                {(aiError || aiNotice) && (
                  <div className="mt-3 space-y-2">
                    {aiError && (
                      <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{aiError}</span>
                      </div>
                    )}
                    {aiNotice && (
                      <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{aiNotice}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                  赏味随笔 / 特色描述
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="用一两句话描述这道菜的口感、风味或家庭回忆..."
                  className="w-full text-xs sm:text-sm rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-3 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              {/* Ingredients Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    食材明细清单 ({ingredients.length})
                  </label>
                  <button
                    type="button"
                    onClick={addIngredientRow}
                    className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加一行食材</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="食材名称 (如: 五花肉)"
                        value={ing.name}
                        onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                        className="flex-1 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3 py-1.5 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="text"
                        placeholder="用量 (如: 300g / 2勺)"
                        value={ing.amount}
                        onChange={(e) => updateIngredient(idx, 'amount', e.target.value)}
                        className="w-32 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3 py-1.5 text-stone-900 dark:text-stone-100 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      {ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredientRow(idx)}
                          className="p-1.5 text-stone-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    烹饪做法步骤 ({steps.length})
                  </label>
                  <button
                    type="button"
                    onClick={addStepRow}
                    className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加一步</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {steps.map((st, idx) => (
                    <div
                      key={st.order}
                      className="p-3 bg-white dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-400 font-mono">
                          第 {st.order} 步
                        </span>
                        {steps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStepRow(idx)}
                            className="text-xs text-stone-400 hover:text-rose-500"
                          >
                            删除本步
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="步骤小标题 (如: 焯水断生)"
                        value={st.title}
                        onChange={(e) => updateStep(idx, 'title', e.target.value)}
                        className="w-full text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2.5 py-1 text-stone-900 dark:text-stone-100"
                      />
                      <textarea
                        rows={2}
                        placeholder="操作指引..."
                        value={st.instruction}
                        onChange={(e) => updateStep(idx, 'instruction', e.target.value)}
                        className="w-full text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-2.5 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Nutrition Auto-Calculator & Fields */}
              <div className="bg-white dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                      营养学关键指标
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap ${
                        hasAIKey
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                          : 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700'
                      }`}
                    >
                      {hasAIKey ? 'AI 估算' : '基础估算'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleNutritionButton}
                    disabled={isAiNutritionLoading}
                    className="shrink-0 whitespace-nowrap text-[11px] sm:text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 font-semibold flex items-center gap-1 disabled:opacity-60"
                  >
                    {isAiNutritionLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : hasAIKey ? (
                      <Sparkles className="w-3.5 h-3.5" />
                    ) : (
                      <Calculator className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isAiNutritionLoading
                        ? '估算中…'
                        : hasAIKey
                          ? 'AI 重算'
                          : '按食材重算'}
                    </span>
                  </button>
                </div>
                <p className="text-[10px] text-stone-400">每份整盘预估</p>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 font-mono">
                  {(
                    [
                      { key: 'calories', label: '热量 (kcal)', step: 1 },
                      { key: 'protein', label: '蛋白质 (g)', step: 0.1 },
                      { key: 'carbs', label: '碳水 (g)', step: 0.1 },
                      { key: 'fat', label: '脂肪 (g)', step: 0.1 },
                      { key: 'fiber', label: '纤维 (g)', step: 0.1 },
                      { key: 'sodium', label: '钠 (mg)', step: 1 },
                    ] as Array<{ key: keyof NutritionInfo; label: string; step: number }>
                  ).map((field) => (
                    <div key={field.key}>
                      <label className="text-[10px] text-stone-500 block">{field.label}</label>
                      <NumberField
                        min={0}
                        step={field.step}
                        value={nutrition[field.key] ?? 0}
                        onChange={(next) => setNutrition({ ...nutrition, [field.key]: next })}
                        ariaLabel={field.label}
                        className="w-full text-xs rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 px-2 py-1 tabular-nums"
                      />
                    </div>
                  ))}
                </div>

                <details className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-900/30">
                  <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    更多营养：糖、维生素、叶酸、矿物质
                  </summary>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 font-mono px-3 pb-3">
                    {MICRO_FIELDS.map((field) => (
                      <div key={field.key}>
                        <label className="text-[10px] text-stone-500 block">{field.label}</label>
                        <NumberField
                          min={0}
                          step={field.step}
                          value={nutrition[field.key] ?? 0}
                          onChange={(next) => setNutrition({ ...nutrition, [field.key]: next })}
                          ariaLabel={field.label}
                          className="w-full text-xs rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 px-2 py-1 tabular-nums"
                        />
                      </div>
                    ))}
                  </div>
                </details>
              </div>

              {/* Footer submit */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  {editingDish ? '保存修改' : '确认入库菜谱'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <ImageLightbox src={lightboxSrc} alt="菜品封面大图" onClose={() => setLightboxSrc(null)} />
      {cropFile && (
        <ImageCropper
          file={cropFile}
          title="裁剪菜品图片"
          aspect={4 / 3}
          aspects={[1, 4 / 3, 16 / 9]}
          onCancel={() => setCropFile(null)}
          onDone={(cropped) => void uploadCover(cropped)}
        />
      )}
    </div>
  );
};
