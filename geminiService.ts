import { GoogleGenAI, Type } from "@google/genai";
import { VisualStyle, TypographyStyle, RecognitionReport } from "./types";

const SYSTEM_INSTRUCTION = `你是一位世界顶级的电商视觉策划专家和AI绘画提示词专家。
你的任务是协助用户完成产品识别、卖点提取，并生成一套完整的（10张）电商海报提示词系统。

核心目标：
1. 识别产品细节（通过提供的1-2张参考图）。
2. 根据产品调性推荐或接受用户的视觉风格与排版选择。
3. 生成中英文双语、极其详尽、且具备高度落地性的渲染提示词。

必须遵循的排版格式：
海报必须包含：详细的中英文提示词、排版布局说明。
所有海报必须保持品牌风格统一，LOGO位置合理且一致。`;

// Helper to get the effective API Key
const getEffectiveKey = (userKey?: string, isAdmin: boolean = false) => {
  // Priority: 
  // 1. User Input Key (用户手动输入) - Always allowed
  // 2. process.env.API_KEY / VITE_API_KEY - Only allowed if isAdmin is true

  if (userKey && userKey.trim().length > 0) {
    return userKey;
  }

  if (isAdmin) {
    const systemKey = process.env.API_KEY || import.meta.env.VITE_API_KEY;
    if (systemKey) {
      return systemKey;
    }
  }
  
  throw new Error(isAdmin 
    ? "管理员模式下未检测到系统环境变量 API Key。" 
    : "未检测到 API Key。请在「配置」中输入您的 Key，或者登录管理员账号以使用系统内置 Key。");
};

export const extractProductInfo = async (imagesB64: string[], textDescription: string, userApiKey?: string, isAdmin: boolean = false): Promise<RecognitionReport> => {
  const apiKey = getEffectiveKey(userApiKey, isAdmin);
  const ai = new GoogleGenAI({ apiKey });
  
  const parts: any[] = [];
  
  if (imagesB64 && imagesB64.length > 0) {
    imagesB64.forEach(b64 => {
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
  
  请严格根据以下JSON格式返回数据：
  {
    "brandName": "识别到的品牌名",
    "productType": "产品类别",
    "productSpecs": "规格参数",
    "coreSellingPoints": ["卖点1", "卖点2", "卖点3", "卖点4", "卖点5"],
    "mainColors": "配色说明",
    "auxColors": "辅助色说明",
    "designStyle": "设计语言描述",
    "targetAudience": "目标受众",
    "brandTone": "品牌调性",
    "packagingHighlights": "包装亮点"
  }
  用户提供的描述：${textDescription || '无'}` });

  // Use ai.models.generateContent with model and contents in one call
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
          packagingHighlights: { type: Type.STRING }
        }
      }
    }
  });

  // Clean the text to remove potential markdown formatting before parsing
  let text = response.text || '{}';
  console.log("Raw Analysis Response:", text); // Debug log

  try {
    // 1. Aggressive Markdown Cleanup: Remove ```json, ```, and standard markdown wrappers
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');

    // 2. Substring Extraction: Find the valid JSON object { ... }
    // This handles cases where the model adds "Here is your JSON:" prefix
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        text = text.substring(firstOpen, lastClose + 1);
    }

    // 3. Remove trailing commas in arrays/objects which cause JSON.parse to fail
    // Replace ", }" with "}" and ", ]" with "]"
    text = text.replace(/,(\s*[}\]])/g, '$1');

    const parsed = JSON.parse(text);

    // Ensure strictly valid structure with defaults to prevent crashes
    return {
      brandName: parsed.brandName || '',
      productType: parsed.productType || '',
      productSpecs: parsed.productSpecs || '',
      coreSellingPoints: Array.isArray(parsed.coreSellingPoints) ? parsed.coreSellingPoints : [],
      mainColors: parsed.mainColors || '',
      auxColors: parsed.auxColors || '',
      designStyle: parsed.designStyle || '',
      targetAudience: parsed.targetAudience || '',
      brandTone: parsed.brandTone || '',
      packagingHighlights: parsed.packagingHighlights || ''
    };
  } catch (e) {
    console.error("JSON Parse failed:", e);
    console.error("Problematic text:", text);
    throw new Error("解析产品报告失败。AI 返回的数据格式有误，请重试或检查图片是否清晰。");
  }
};

export const generatePosterSystem = async (
  report: RecognitionReport,
  visualStyle: VisualStyle,
  typography: TypographyStyle,
  specialNeeds: string,
  userApiKey?: string,
  isAdmin: boolean = false
): Promise<string> => {
  const apiKey = getEffectiveKey(userApiKey, isAdmin);
  const ai = new GoogleGenAI({ apiKey });
  
  // Safety check for array joining
  const sellingPointsStr = Array.isArray(report.coreSellingPoints) 
    ? report.coreSellingPoints.join(', ') 
    : String(report.coreSellingPoints || '');

  const prompt = `基于以下产品报告生成一套电商全系统海报（共11个模块，含LOGO提示词）。
  
  【产品信息】
  品牌：${report.brandName}
  类型：${report.productType}
  核心卖点：${sellingPointsStr}
  主视觉：${report.mainColors}
  调性：${report.brandTone}
  
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
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 16384 }
    }
  });

  return response.text || '';
};

export const generateImageContent = async (
  imagesB64: string[],
  prompt: string,
  aspectRatio: string,
  userApiKey?: string,
  isAdmin: boolean = false
): Promise<string | undefined> => {
  const apiKey = getEffectiveKey(userApiKey, isAdmin);
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { 
      parts: [
        ...imagesB64.map(img => ({ inlineData: { data: img, mimeType: 'image/jpeg' } })), 
        { text: `高端电商摄影风格。还原参考图产品。场景描述：${prompt}。比例：${aspectRatio}。电影级光影。` }
      ] 
    },
    config: { imageConfig: { aspectRatio: aspectRatio as any } }
  });
  
  return response.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
};