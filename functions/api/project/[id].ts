
interface KVNamespace {
  delete(key: string): Promise<void>;
}

interface R2ObjectBody {
  writeHttpMetadata(headers: Headers): void;
  httpEtag: string;
  body: ReadableStream;
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
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
  const id = context.params.id as string;
  
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  try {
    // 从 R2 获取完整 JSON
    const object = await context.env.VISION_R2.get(`project-${id}`);

    if (object === null) {
      return new Response("Project not found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set("Content-Type", "application/json");

    return new Response(object.body, { headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;

  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  try {
    // 同时删除 KV 和 R2
    await Promise.all([
      context.env.VISION_KV.delete(`meta:${id}`),
      context.env.VISION_R2.delete(`project-${id}`)
    ]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
