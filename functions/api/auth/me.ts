
interface Env {
  VISION_KV: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const cookieHeader = context.request.headers.get("Cookie");
  if (!cookieHeader) {
    return new Response(JSON.stringify({ authenticated: false }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // Parse cookies
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [key, ...v] = c.split("=");
      return [key, v.join("=")];
    })
  );

  const sessionId = cookies["auth_session"];
  if (!sessionId) {
    return new Response(JSON.stringify({ authenticated: false }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // Get session from KV
  const sessionStr = await context.env.VISION_KV.get(`session:${sessionId}`);
  if (!sessionStr) {
    return new Response(JSON.stringify({ authenticated: false }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  const session = JSON.parse(sessionStr);

  // Optional: Check expiry manually if not relying solely on KV TTL
  if (session.expiresAt && Date.now() > session.expiresAt) {
     return new Response(JSON.stringify({ authenticated: false }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // Get User Profile
  const userStr = await context.env.VISION_KV.get(`user:${session.userId}`);
  if (!userStr) {
    // Orphaned session
    return new Response(JSON.stringify({ authenticated: false }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  const user = JSON.parse(userStr);

  return new Response(JSON.stringify({ 
    authenticated: true,
    user: user
  }), { 
    status: 200, 
    headers: { "Content-Type": "application/json" } 
  });
};
