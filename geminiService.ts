
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { VisualStyle, TypographyStyle, RecognitionReport } from "./types";

const SYSTEM_INSTRUCTION = `你是一位世界顶级的电商视觉策划专家和AI绘画提示词专家。
你的任务是协助用户完成产品识别、卖点提取，并配合生成一套完整的（10张）电商海报提示词系统。

核心目标：
1. 识别产品细节（通过提供的1-2张参考图）。
2. 根据产品调性推荐或接受用户的视觉风格与排版选择。
3. 生成中英文双语、极其详尽、且具备高度落地性的渲染提示词。

必须遵循的排版格式：
海报必须包含：详细的中英文提示词、排版布局说明。
所有海报必须保持品牌风格统一，LOGO位置合理且一致。`;

// 获取有效 Key 的辅助函数
const getEffectiveKey = (userApiKey?: string, isAdmin: boolean = false) => {
  if (userApiKey && userApiKey.trim().length > 0) {
    return userApiKey;
  }
  if (isAdmin && process.env.API_KEY) { 
     return process.env.API_KEY;
  }
  throw new Error("请配置 API Key 或登录管理员账号");
};

// Helper: Ensure we have base64 data (fetch if it's a URL)
const ensureBase64 = async (img: string): Promise<string> => {
    if (!img) return '';

    // Case 1: Full Data URI (e.g. data:image/jpeg;base64,...)
    if (img.startsWith('data:')) {
        return img.split(',')[1];
    }

    // Case 2: URL (Remote image http... or Local API path /api/...)
    // A raw base64 string for an image is typically very large (> 1KB).
    // A URL is typically short. We check for common URL prefixes or length.
    const isLikelyUrl = img.startsWith('http') || img.startsWith('/') || img.length < 2048;

    if (isLikelyUrl) {
        try {
            const res = await fetch(img);
            if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
            const blob = await res.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const res = reader.result as string;
                    // FileReader returns data:uri, we need to strip it again for Gemini
                    resolve(res.split(',')[1]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Failed to fetch image for AI:", img, e);
            throw new Error("无法读取图片数据，请检查网络或图片地址");
        }
    }

    // Case 3: Raw Base64 string
    // If it's not a Data URI and not a URL, it must be the raw base64 string stored in state.
    // We return it directly.
    return img;
};

export const extractProductInfo = async (
  imagesInput: string[], 
  textDescription: string, 
  userApiKey?: string, 
  isAdmin: boolean = false,
  modelName: string = 'gemini-3-flash-preview'
): Promise<RecognitionReport> => {
  const apiKey = getEffectiveKey(userApiKey, isAdmin);
  const ai = new GoogleGenAI({ apiKey });
  
  const parts: any[] = [];
  
  if (imagesInput && imagesInput.length > 0) {
    // Process all images to ensure they are base64
    const processedImages = await Promise.all(imagesInput.map(ensureBase64));
    
    processedImages.forEach(b64 => {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: b64
        }
      });
    });
  }
  
  parts.push({ text: `分析上述产品图片并生成一份详尽的识别报告。
  
  【重要要求】
  1. 请务必只输出纯 JSON 字符串。
  2. 严禁使用 markdown 格式（不要包含 \`\`\`json 或 \`\`\`）。
  3. 严禁包含任何开场白或解释性文字。
  4. **必须填充所有字段。对于包装风格、字体风格、图案元素，如果图片中不明显，请根据产品类别和整体调性进行专业推断，绝对不要返回空字符串或"无"、"未知"、"未识别"。**
  
  请严格根据以下JSON格式返回数据：
  {
    "brandName": "识别到的品牌名（无则根据包装文字推断）",
    "productType": "产品类别",
    "productSpecs": "规格参数",
    "coreSellingPoints": ["卖点1", "卖点2", "卖点3", "卖点4", "卖点5"],
    "mainColors": "配色说明（如：活力橙、深海蓝）",
    "auxColors": "辅助色说明",
    "designStyle": "设计语言描述（例如：极简主义、科技未来、复古国潮等）",
    "targetAudience": "目标受众",
    "brandTone": "品牌调性",
    "packagingHighlights": "包装亮点",
    "packagingStyle": "包装风格关键词",
    "fontStyle": "字体特征描述",
    "patternElements": "装饰纹理或图案"
  }
  用户提供的描述：${textDescription || '无'}` });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          brandName: { type: Type.STRING },
          productType: { type: Type.STRING },
          productSpecs: { type: Type.STRING },
          coreSellingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          mainColors: { type: Type.STRING },
          auxColors: { type: Type.STRING },
          designStyle: { type: Type.STRING },
          targetAudience: { type: Type.STRING },
          brandTone: { type: Type.STRING },
          packagingHighlights: { type: Type.STRING },
          packagingStyle: { type: Type.STRING },
          fontStyle: { type: Type.STRING },
          patternElements: { type: Type.STRING }
        }
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ]
    }
  });

  let text = response.text;
  
  if (!text) {
    return {
       brandName: "识别失败",
       productType: "未知品类",
       productSpecs: "暂无数据",
       coreSellingPoints: ["AI未能提取卖点"],
       mainColors: "暂无",
       auxColors: "暂无",
       designStyle: "暂无风格描述",
       targetAudience: "未知",
       brandTone: "未知",
       packagingHighlights: "暂无",
       packagingStyle: "常规设计",
       fontStyle: "标准字体",
       patternElements: "无明显纹理"
    };
  }

  try {
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        text = text.substring(firstOpen, lastClose + 1);
    }
    text = text.replace(/,(\s*[}\]])/g, '$1');
    const parsed = JSON.parse(text);

    return {
      brandName: parsed.brandName || '',
      productType: parsed.productType || '',
      productSpecs: parsed.productSpecs || '',
      coreSellingPoints: Array.isArray(parsed.coreSellingPoints) ? parsed.coreSellingPoints : [],
      mainColors: parsed.mainColors || '',
      auxColors: parsed.auxColors || '',
      designStyle: parsed.designStyle || '现代简约风格',
      targetAudience: parsed.targetAudience || '',
      brandTone: parsed.brandTone || '',
      packagingHighlights: parsed.packagingHighlights || '暂无更多细节',
      packagingStyle: parsed.packagingStyle || '简约风格', 
      fontStyle: parsed.fontStyle || '现代无衬线',
      patternElements: parsed.patternElements || '纯色/渐变'
    };
  } catch (e) {
    console.error("JSON Parse failed", e);
    throw new Error("解析产品报告失败。AI 返回的数据格式有误。");
  }
};

export const generatePosterSystem = async (
  report: RecognitionReport,
  visualStyle: VisualStyle,
  typography: TypographyStyle,
  specialNeeds: string,
  userApiKey?: string, 
  isAdmin: boolean = false,
  modelName: string = 'gemini-3-flash-preview'
): Promise<string> => {
  const apiKey = getEffectiveKey(userApiKey, isAdmin);
  const ai = new GoogleGenAI({ apiKey });
  
  const sellingPointsStr = (report.coreSellingPoints && Array.isArray(report.coreSellingPoints))
    ? report.coreSellingPoints.join(', ') 
    : String(report.coreSellingPoints || '');

  const prompt = `基于以下产品报告生成一套电商全系统海报（共11个模块，含LOGO提示词）。
  
  【产品信息】
  品牌：${report.brandName}
  类型：${report.productType}
  核心卖点：${sellingPointsStr}
  主视觉：${report.mainColors}
  调性：${report.brandTone}
  包装风格：${report.packagingStyle || ''}
  
  【设计配置】
  风格：${visualStyle}
  排版：${typography}
  特殊要求：${specialNeeds}
  
  输出要求：
  - 每张图必须包含极其精细的提示词。
  - 必须按以下格式输出标题以便解析：
    ### LOGO方案提示词
    ### 海报01 - 核心主KV
    ### 海报02 - 使用场景图
    ### 海报03 - 核心工艺拆解
    ### 海报04 - 细节质感图01
    ### 海报05 - 细节质感图02
    ### 海报06 - 核心功效说明
    ### 海报07 - 内部结构/成分图
    ### 海报08 - 品牌情感大片
    ### 海报09 - 详细参数图
    ### 海报10 - 使用流程图
  - 提示词必须强调：严格还原包装形态、品牌颜色和标识位置。`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 16384 },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ]
    }
  });

  return response.text || '';
};

export const generateImageContent = async (
  imagesInput: string[],
  prompt: string,
  aspectRatio: string,
  userApiKey?: string, 
  isAdmin: boolean = false,
  modelName: string = 'gemini-3-pro-image-preview'
): Promise<string | undefined> => {
  const apiKey = getEffectiveKey(userApiKey, isAdmin);
  const ai = new GoogleGenAI({ apiKey });

  const processedImages = await Promise.all(imagesInput.map(ensureBase64));

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { 
      parts: [
        ...processedImages.map(b64 => ({ inlineData: { data: b64, mimeType: 'image/jpeg' } })), 
        { text: `高端电商摄影风格。还原参考图产品。场景描述：${prompt}。比例：${aspectRatio}。电影级光影。` }
      ] 
    },
    config: { 
      imageConfig: { aspectRatio: aspectRatio as any },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ]
    }
  });
  
  const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  return imagePart?.inlineData?.data;
};
