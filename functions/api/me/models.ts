
interface KVNamespace {
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

// GET: Fetch user models
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const userId = await getCurrentUserId(context.request, context.env);
  if (!userId) {
     return new Response("Unauthorized", { status: 401 });
  }

  const userStr = await context.env.VISION_KV.get(`user:${userId}`);
  if (!userStr) {
     return new Response("User not found", { status: 404 });
  }

  const user = JSON.parse(userStr);
  
  return new Response(JSON.stringify({
    logic: user.customLogicModels || [],
    visual: user.customVisualModels || []
  }), {
    headers: { "Content-Type": "application/json" }
  });
};

// POST: Save user models
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = await getCurrentUserId(context.request, context.env);
  if (!userId) {
     return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { logic, visual } = await context.request.json() as any;
    
    const userStr = await context.env.VISION_KV.get(`user:${userId}`);
    if (!userStr) {
        return new Response("User not found", { status: 404 });
    }

    const user = JSON.parse(userStr);

    // Update models if provided
    if (Array.isArray(logic)) user.customLogicModels = logic;
    if (Array.isArray(visual)) user.customVisualModels = visual;

    await context.env.VISION_KV.put(`user:${userId}`, JSON.stringify(user));

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};