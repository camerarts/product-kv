
interface R2Bucket {
  put(key: string, value: any, options?: any): Promise<void>;
  get(key: string): Promise<any>;
}

interface Env {
  VISION_R2: R2Bucket;
}

type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
}) => Response | Promise<Response>;

// Upload Image
export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.VISION_R2) {
        return new Response("Server Misconfiguration: R2 missing", { status: 500 });
    }

    const key = context.params.key as string;
    const url = new URL(context.request.url);
    const projectId = url.searchParams.get('project');

    if (!key) return new Response("Missing Key", { status: 400 });

    // Construct storage path: images/<projectId>/<uuid> or temp/<uuid>
    const r2Path = projectId ? `images/${projectId}/${key}` : `temp/${key}`;
    const contentType = context.request.headers.get('Content-Type') || 'application/octet-stream';

    // Stream the request body directly to R2
    await context.env.VISION_R2.put(r2Path, context.request.body, {
        httpMetadata: { contentType }
    });

    const publicUrl = `/api/images/${key}${projectId ? '?project=' + projectId : ''}`;

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

// Serve Image
export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const key = context.params.key as string;
        const url = new URL(context.request.url);
        const projectId = url.searchParams.get('project');

        const r2Path = projectId ? `images/${projectId}/${key}` : `temp/${key}`;
        
        const object = await context.env.VISION_R2.get(r2Path);

        if (!object) {
            return new Response("Image not found", { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        // Cache control for performance
        headers.set('Cache-Control', 'public, max-age=31536000');

        return new Response(object.body, { headers });
    } catch (e: any) {
        return new Response("Error fetching image", { status: 500 });
    }
};
