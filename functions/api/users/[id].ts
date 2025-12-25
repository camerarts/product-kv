
interface KVNamespace {
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
    // Delete User Profile
    await context.env.VISION_KV.delete(`user:${userId}`);
    // Note: Active sessions for this user will fail auth on next check because user profile is missing.
    // Ideally we would also iterate and delete session keys, but KV listing is expensive.
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
