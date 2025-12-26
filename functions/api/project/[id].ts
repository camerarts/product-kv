
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
    const projectStr = await context.env.VISION_KV.get(`project:${id}`);

    if (!projectStr) {
      // Logic could be added here to check R2 for legacy `project-{id}` if needed for migration
      return new Response("Project not found", { status: 404 });
    }

    const project = JSON.parse(projectStr);

    // 2. Fetch Images from R2
    const imagePrefix = `images/${id}/`;
    let listed = await context.env.VISION_R2.list({ prefix: imagePrefix });
    const allObjects = [...listed.objects];
    
    // Handle pagination if necessary
    while(listed.truncated) {
        listed = await context.env.VISION_R2.list({ prefix: imagePrefix, cursor: listed.cursor });
        allObjects.push(...listed.objects);
    }

    const imagePromises = allObjects.map(async (obj) => {
        const r2Obj = await context.env.VISION_R2.get(obj.key);
        if (!r2Obj) return null;
        
        const arrayBuffer = await r2Obj.arrayBuffer();
        const base64 = uint8ArrayToBase64(new Uint8Array(arrayBuffer));
        return { key: obj.key, base64 };
    });

    const imagesData = await Promise.all(imagePromises);

    // 3. Reconstruct Project Data
    // Ensure containers exist
    if (!project.data.images) project.data.images = [];
    if (!project.data.generatedImages) project.data.generatedImages = {};

    imagesData.forEach(item => {
        if (!item) return;
        const filename = item.key.split('/').pop(); // e.g., ref-0, gen-1
        if (!filename) return;

        if (filename.startsWith('ref-')) {
            const indexStr = filename.replace('ref-', '');
            const index = parseInt(indexStr);
            if (!isNaN(index)) {
                // Restore Reference Image (Raw Base64)
                project.data.images[index] = item.base64;
            }
        } else if (filename.startsWith('gen-')) {
            const indexStr = filename.replace('gen-', '');
            const index = parseInt(indexStr);
            if (!isNaN(index)) {
                // Restore Generated Image (Data URI)
                project.data.generatedImages[index] = `data:image/jpeg;base64,${item.base64}`;
            }
        }
    });

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
