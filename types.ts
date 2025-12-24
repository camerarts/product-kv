
export enum VisualStyle {
  MAGAZINE = '📖 杂志编辑风格',
  WATERCOLOR = '🎨 水彩艺术风格',
  TECH = '🤖 科技未来风格',
  RETRO = '🎞️ 复古胶片风格',
  NORDIC = '🏔️ 极简北欧风格',
  NEON = '🌃 霓虹赛博风格',
  NATURAL = '🌿 自然有机风格'
}

export enum TypographyStyle {
  SERIF_GRID = '📰 粗衬线大标题 + 细线装饰 + 网格对齐',
  GLASS_MODERN = '🔮 玻璃拟态卡片 + 半透明背景 + 柔和圆角',
  LUXURY_3D = '💎 3D浮雕文字 + 金属质感 + 光影效果',
  WATERCOLOR_ART = '🖌️ 手写体标注 + 水彩笔触 + 不规则布局',
  NEON_CYBER = '⚡ 无衬线粗体 + 霓虹描边 + 发光效果',
  MINIMAL_LINE = '📏 极细线条字 + 大量留白 + 精确对齐'
}

export interface RecognitionReport {
  brandName: string;
  productType: string;
  productSpecs: string;
  coreSellingPoints: string[];
  mainColors: string;
  auxColors: string;
  designStyle: string;
  targetAudience: string;
  brandTone: string;
  packagingHighlights: string;
}

export interface PosterSystem {
  posters: {
    id: string;
    title: string;
    description: string;
    promptCn: string;
    promptEn: string;
    negative: string;
    layout: string;
  }[];
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
