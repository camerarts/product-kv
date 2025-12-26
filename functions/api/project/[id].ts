
interface KVNamespace {
  delete(key: string): Promise<void>;
}

interface R2ObjectBody {
  writeHttpMetadata(headers: Headers): void;
  httpEtag: string;
  body: ReadableStream;
}

interface R2Objects {
  objects: { key: string }[];
  truncated: boolean;
  cursor?: string;
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string | string[]): Promise<void>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<R2Objects>;
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
    // 1. Delete main Project JSON
    const deleteMainR2 = context.env.VISION_R2.delete(`project-${id}`);
    
    // 2. Delete Meta KV
    const deleteKV = context.env.VISION_KV.delete(`meta:${id}`);

    // 3. Delete Associated Images Folder (List then Delete)
    // R2 doesn't have "delete folder", so we list objects with prefix "images/{id}/"
    const imagePrefix = `images/${id}/`;
    let listed = await context.env.VISION_R2.list({ prefix: imagePrefix });
    const imageKeysToDelete = listed.objects.map(o => o.key);
    
    // Handle pagination if more than 1000 images (unlikely for this app, but good practice)
    while(listed.truncated) {
        listed = await context.env.VISION_R2.list({ prefix: imagePrefix, cursor: listed.cursor });
        imageKeysToDelete.push(...listed.objects.map(o => o.key));
    }

    const deleteImages = imageKeysToDelete.length > 0 
        ? context.env.VISION_R2.delete(imageKeysToDelete) 
        : Promise.resolve();

    await Promise.all([deleteMainR2, deleteKV, deleteImages]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
