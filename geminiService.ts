
import { GoogleGenAI, Type } from "@google/genai";
import { VisualStyle, TypographyStyle, RecognitionReport } from "./types";

const SYSTEM_INSTRUCTION = `你是一位世界顶级的电商视觉策划专家和AI绘画提示词专家。
你的任务是协助用户完成产品识别、卖点提取，并生成一套完整的（10张）电商海报提示词系统。

核心目标：
1. 识别产品细节（通过提供的1-2张参考图）。如果提供多张图片，请综合分析。
2. 根据产品调性推荐或接受用户的视觉风格与排版选择。
3. 生成中英文双语、极其详尽、且具备高度落地性的Midjourney/Stable Diffusion提示词。

必须遵循的排版格式：
海报必须包含：中文提示词、英文Prompt、负面词、详细的中英文排版布局说明。
所有海报必须保持风格统一，LOGO位置统一。`;

export const extractProductInfo = async (imagesB64?: string[], textDescription?: string): Promise<RecognitionReport> => {
  // Create a new GoogleGenAI instance right before the call to use the latest API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
  
  parts.push({ text: `分析上述产品图片（可能提供多角度或多张）并生成一份详尽的【识别报告】。
  请根据以下JSON格式返回数据：
  {
    "brandName": "品牌中文 / 品牌英文",
    "productType": "大类 - 具体产品",
    "productSpecs": "具体规格",
    "coreSellingPoints": ["卖点1", "卖点2", "卖点3", "卖点4", "卖点5"],
    "mainColors": "颜色名称 (#HEX) + 颜色名称 (#HEX)",
    "auxColors": "颜色名称 (#HEX)",
    "designStyle": "风格描述",
    "targetAudience": "用户画像",
    "brandTone": "调性描述",
    "packagingHighlights": "特殊设计元素"
  }
  描述内容：${textDescription || '无额外描述'}` });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      // Use responseSchema for robust and structured output
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

  return JSON.parse(response.text || '{}');
};

export const generatePosterSystem = async (
  report: RecognitionReport,
  visualStyle: VisualStyle,
  typography: TypographyStyle,
  specialNeeds: string
): Promise<string> => {
  // Create a new GoogleGenAI instance right before the call to use the latest API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `基于以下识别报告生成【十张海报全案系统】（共11个模块，包含LOGO生成提示词）。
  
  【识别报告】
  品牌：${report.brandName}
  类型：${report.productType}
  核心卖点：${report.coreSellingPoints.join(', ')}
  主色调：${report.mainColors}
  品牌调性：${report.brandTone}
  包装亮点：${report.packagingHighlights}
  
  【选定配置】
  视觉风格：${visualStyle}
  排版效果：${typography}
  特殊需求：${specialNeeds}
  
  要求：
  - 严格还原包装设计、颜色、LOGO位置。
  - 必须严格按以下标题格式输出，以便系统解析：
    ### LOGO生成提示词
    ### 海报01 - 主KV视觉
    ### 海报02 - 生活场景
    ### 海报03 - 工艺技术
    ### 海报04 - 细节特写01
    ### 海报05 - 细节特写02
    ### 海报06 - 功能细节
    ### 海报07 - 细节特写04
    ### 海报08 - 品牌故事
    ### 海报09 - 产品参数表
    ### 海报10 - 使用指南
  - 必须在中英文Prompt中强调“严格还原包装设计、颜色、LOGO位置”。
  - 提供极其详细的排版布局（中英双语如何排、位置坐标、字体风格、色值）。`;

  const response = await ai.models.generateContent({
    // Use gemini-3-pro-preview for complex reasoning and creative generation tasks
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    }
  });

  return response.text || '';
};
