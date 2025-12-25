
interface Env {
  VISION_KV: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const cookieHeader = context.request.headers.get("Cookie");
  let sessionId = null;

  if (cookieHeader) {
    const cookies = Object.fromEntries(
        cookieHeader.split("; ").map((c) => {
        const [key, ...v] = c.split("=");
        return [key, v.join("=")];
        })
    );
    sessionId = cookies["auth_session"];
  }

  if (sessionId) {
    // Delete from KV
    await context.env.VISION_KV.delete(`session:${sessionId}`);
  }

  // Clear Cookie
  const headers = new Headers();
  headers.append("Set-Cookie", "auth_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure");
  headers.append("Content-Type", "application/json");

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: headers,
  });
};
