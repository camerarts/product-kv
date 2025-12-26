
interface KVNamespace {
  list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface R2Bucket {
  put(key: string, value: any): Promise<void>;
}

type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
}) => Response | Promise<Response>;

interface Env {
  VISION_KV: KVNamespace;
  VISION_R2: R2Bucket;
  ADMIN_PASSWORD?: string;
}

// Helper: Get Current User ID from Session Cookie
async function getCurrentUserId(request: Request, env: Env): Promise<string | null> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [key, ...v] = c.split("=");
      return [key, v.join("=")];
    })
  );

  const sessionId = cookies["auth_session"];
  if (!sessionId) return null;

  const sessionStr = await env.VISION_KV.get(`session:${sessionId}`);
  if (!sessionStr) return null;

  const session = JSON.parse(sessionStr);
  if (session.expiresAt && Date.now() > session.expiresAt) return null;

  return session.userId;
}

// Helper: Check Admin
function isAdmin(request: Request, env: Env): boolean {
  const adminPass = request.headers.get("X-Admin-Pass");
  const envPass = env.ADMIN_PASSWORD;
  return !!(envPass && adminPass === envPass);
}

// Helper: Convert Base64 string to Uint8Array for R2
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const isUserAdmin = isAdmin(context.request, context.env);
    const currentUserId = await getCurrentUserId(context.request, context.env);

    // If not admin and not logged in, return empty or unauthorized
    if (!isUserAdmin && !currentUserId) {
        return new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" }
        });
    }

    // List all projects metadata
    const list = await context.env.VISION_KV.list({ prefix: "meta:" });
    const projects = [];

    for (const key of list.keys) {
      const metaStr = await context.env.VISION_KV.get(key.name);
      if (metaStr) {
        const meta = JSON.parse(metaStr);
        
        // Filter Logic:
        // 1. Admin sees everything.
        // 2. User sees only projects where userId matches.
        
        if (isUserAdmin) {
            projects.push(meta);
        } else if (currentUserId && meta.userId === currentUserId) {
            projects.push(meta);
        }
      }
    }

    // Sort by timestamp desc
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

    const isUserAdmin = isAdmin(context.request, context.env);
    const currentUserId = await getCurrentUserId(context.request, context.env);

    // Determine Owner
    let ownerId = null;
    if (isUserAdmin) {
        ownerId = 'admin'; 
    } else if (currentUserId) {
        ownerId = currentUserId;
    } else {
        return new Response("Unauthorized: Please login to save", { status: 401 });
    }

    // 1. Extract Meta
    const metadata = {
      id: project.id,
      name: project.name,
      timestamp: project.timestamp,
      brandName: project.data.manualBrand || project.data.report?.brandName || '未命名品牌',
      userId: ownerId, // Bind project to user
      userName: project.userName || 'Unknown' // Save creator name for display
    };

    // Update project object with userId as well for R2 storage consistency
    project.userId = ownerId;

    // --- 2. Save Images Separately to R2 (Fix for visibility) ---
    // We do this asynchronously to not block the main save too much, 
    // but we use Promise.all to ensure completion.
    const imageUploadPromises: Promise<void>[] = [];

    // A. Handle Uploaded Reference Images
    if (project.data.images && Array.isArray(project.data.images)) {
        project.data.images.forEach((b64: string, index: number) => {
            if (b64) {
                // b64 here is raw base64 (no data prefix) based on frontend logic
                try {
                    const buffer = base64ToUint8Array(b64);
                    const key = `images/${project.id}/ref-${index}.jpg`;
                    imageUploadPromises.push(context.env.VISION_R2.put(key, buffer));
                } catch (e) {
                    console.error(`Failed to upload ref image ${index}`, e);
                }
            }
        });
    }

    // B. Handle Generated Poster Images
    if (project.data.generatedImages) {
        Object.entries(project.data.generatedImages).forEach(([keyIndex, dataUri]) => {
            if (typeof dataUri === 'string') {
                try {
                    // dataUri format: "data:image/jpeg;base64,....."
                    const split = dataUri.split(',');
                    if (split.length > 1) {
                        const buffer = base64ToUint8Array(split[1]);
                        const key = `images/${project.id}/generated-${keyIndex}.jpg`;
                        imageUploadPromises.push(context.env.VISION_R2.put(key, buffer));
                    }
                } catch (e) {
                    console.error(`Failed to upload generated image ${keyIndex}`, e);
                }
            }
        });
    }

    // 3. Parallel Store Everything
    const r2MainPromise = context.env.VISION_R2.put(`project-${project.id}`, JSON.stringify(project));
    const kvPromise = context.env.VISION_KV.put(`meta:${project.id}`, JSON.stringify(metadata));

    await Promise.all([r2MainPromise, kvPromise, ...imageUploadPromises]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
