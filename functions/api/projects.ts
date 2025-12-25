
interface KVNamespace {
  list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface R2Bucket {
  put(key: string, value: string): Promise<void>;
}

type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
}) => Response | Promise<Response>;

interface Env {
  VISION_KV: KVNamespace;
  VISION_R2: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // 列出 KV 中所有以 "meta:" 开头的键
    const list = await context.env.VISION_KV.list({ prefix: "meta:" });
    const projects = [];

    for (const key of list.keys) {
      const metaStr = await context.env.VISION_KV.get(key.name);
      if (metaStr) {
        projects.push(JSON.parse(metaStr));
      }
    }

    // 按时间倒序排序
    projects.sort((a: any, b: any) => b.timestamp - a.timestamp);

    return new Response(JSON.stringify(projects), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const project = await context.request.json() as any;
    
    if (!project.id || !project.data) {
      return new Response("Invalid project data", { status: 400 });
    }

    // 1. 提取元数据 (用于列表显示)
    const metadata = {
      id: project.id,
      name: project.name,
      timestamp: project.timestamp,
      brandName: project.data.manualBrand || project.data.report?.brandName || '未命名品牌'
    };

    // 2. 并行存储
    // R2 存储完整数据 (包含图片)
    const r2Promise = context.env.VISION_R2.put(`project-${project.id}`, JSON.stringify(project));
    // KV 存储元数据
    const kvPromise = context.env.VISION_KV.put(`meta:${project.id}`, JSON.stringify(metadata));

    await Promise.all([r2Promise, kvPromise]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
