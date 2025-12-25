
interface KVNamespace {
  list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
  get(key: string): Promise<string | null>;
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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  // 1. Verify Admin Password (Simple header check)
  const adminPass = context.request.headers.get("X-Admin-Pass");
  const envPass = context.env.ADMIN_PASSWORD;

  if (!envPass || adminPass !== envPass) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401,
      headers: { "Content-Type": "application/json" } 
    });
  }

  try {
    // 2. List all users (prefix "user:")
    const list = await context.env.VISION_KV.list({ prefix: "user:" });
    const users = [];

    // 3. Fetch details for each user
    for (const key of list.keys) {
      const userStr = await context.env.VISION_KV.get(key.name);
      if (userStr) {
        users.push(JSON.parse(userStr));
      }
    }

    // Sort by recent login
    users.sort((a: any, b: any) => b.lastLoginAt - a.lastLoginAt);

    return new Response(JSON.stringify(users), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
