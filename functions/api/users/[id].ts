
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

interface Env {
  VISION_KV: KVNamespace;
  ADMIN_PASSWORD?: string;
}

type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
}) => Response | Promise<Response>;

// DELETE User
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  // 1. Verify Admin Password
  const adminPass = context.request.headers.get("X-Admin-Pass");
  const envPass = context.env.ADMIN_PASSWORD;

  if (!envPass || adminPass !== envPass) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401,
      headers: { "Content-Type": "application/json" } 
    });
  }

  const userId = context.params.id as string;
  if (!userId) {
     return new Response("Missing ID", { status: 400 });
  }

  try {
    await context.env.VISION_KV.delete(`user:${userId}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

// PATCH User (Update Expiry)
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const adminPass = context.request.headers.get("X-Admin-Pass");
  const envPass = context.env.ADMIN_PASSWORD;

  if (!envPass || adminPass !== envPass) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401,
      headers: { "Content-Type": "application/json" } 
    });
  }

  const userId = context.params.id as string;
  if (!userId) {
     return new Response("Missing ID", { status: 400 });
  }

  try {
    const body = await context.request.json() as any;
    
    // Fetch existing user
    const userStr = await context.env.VISION_KV.get(`user:${userId}`);
    if (!userStr) {
      return new Response("User not found", { status: 404 });
    }
    const user = JSON.parse(userStr);

    // Update fields
    if (body.expiresAt) {
      user.expiresAt = body.expiresAt;
    }

    // Save back
    await context.env.VISION_KV.put(`user:${userId}`, JSON.stringify(user));

    return new Response(JSON.stringify({ success: true, user }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};