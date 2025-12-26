
interface KVNamespace {
  list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
}) => Response | Promise<Response>;

interface Env {
  VISION_KV: KVNamespace;
  ADMIN_PASSWORD?: string;
}

// Helper: Get Current User ID from Session Cookie
async function getCurrentUserId(request: Request, env: Env): Promise<string | null> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => { const [key, ...v] = c.split("="); return [key, v.join("=")]; }));
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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const isUserAdmin = isAdmin(context.request, context.env);
    const currentUserId = await getCurrentUserId(context.request, context.env);

    if (!isUserAdmin && !currentUserId) {
        return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
    }

    const list = await context.env.VISION_KV.list({ prefix: "meta:" });
    const projects = [];

    for (const key of list.keys) {
      const metaStr = await context.env.VISION_KV.get(key.name);
      if (metaStr) {
        const meta = JSON.parse(metaStr);
        if (isUserAdmin) {
            projects.push(meta);
        } else if (currentUserId && meta.userId === currentUserId) {
            projects.push(meta);
        }
      }
    }
    projects.sort((a: any, b: any) => b.timestamp - a.timestamp);
    return new Response(JSON.stringify(projects), { headers: { "Content-Type": "application/json" } });
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

    let ownerId = null;
    if (isUserAdmin) ownerId = 'admin'; 
    else if (currentUserId) ownerId = currentUserId;
    else return new Response("Unauthorized: Please login to save", { status: 401 });

    const metadata = {
      id: project.id,
      name: project.name,
      timestamp: project.timestamp,
      brandName: project.data.manualBrand || project.data.report?.brandName || '未命名品牌',
      userId: ownerId,
      userName: project.userName || 'Unknown'
    };

    project.userId = ownerId;

    // Note: Images are now uploaded by the frontend and stored as URLs in project.data.images
    // We no longer need to split them here. Just save the JSON.

    const kvProjectPromise = context.env.VISION_KV.put(`project:${project.id}`, JSON.stringify(project));
    const kvMetaPromise = context.env.VISION_KV.put(`meta:${project.id}`, JSON.stringify(metadata));

    await Promise.all([kvProjectPromise, kvMetaPromise]);

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("Project Save Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown server error" }), { status: 500 });
  }
};
