
interface KVNamespace {
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  put(key: string, value: string): Promise<void>;
}

interface R2ObjectBody {
  writeHttpMetadata(headers: Headers): void;
  httpEtag: string;
  body: ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
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

// Helper: Convert Uint8Array to Base64 string
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  try {
    // 1. Get Text JSON from KV
    // The KV JSON already contains the correct image URLs (e.g., /api/images/...)
    // saved by the frontend's sync logic. We should return this directly
    // to ensure the frontend treats them as synced assets.
    const projectStr = await context.env.VISION_KV.get(`project:${id}`);

    if (!projectStr) {
      return new Response("Project not found", { status: 404 });
    }

    const project = JSON.parse(projectStr);

    // Note: We deliberately DO NOT re-hydrate images from R2 back into Base64 here.
    // Doing so would cause the frontend to treat them as "unsynced local images" 
    // and transfer huge amounts of data unnecessarily.
    // The frontend can simply render the URLs stored in project.data.

    return new Response(JSON.stringify(project), {
      headers: { "Content-Type": "application/json" }
    });
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
    // 1. Delete Project JSON from KV
    const deleteProjectKV = context.env.VISION_KV.delete(`project:${id}`);
    
    // 2. Delete Meta KV
    const deleteMetaKV = context.env.VISION_KV.delete(`meta:${id}`);

    // 3. Delete Associated Images from R2
    const imagePrefix = `images/${id}/`;
    let listed = await context.env.VISION_R2.list({ prefix: imagePrefix });
    const imageKeysToDelete = listed.objects.map(o => o.key);
    
    while(listed.truncated) {
        listed = await context.env.VISION_R2.list({ prefix: imagePrefix, cursor: listed.cursor });
        imageKeysToDelete.push(...listed.objects.map(o => o.key));
    }

    const deleteImages = imageKeysToDelete.length > 0 
        ? context.env.VISION_R2.delete(imageKeysToDelete) 
        : Promise.resolve();

    // 4. Also try delete legacy R2 project file if exists, just in case
    const deleteLegacyR2 = context.env.VISION_R2.delete(`project-${id}`);

    await Promise.all([deleteProjectKV, deleteMetaKV, deleteImages, deleteLegacyR2]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
