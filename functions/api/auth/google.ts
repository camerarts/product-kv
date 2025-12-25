
type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
}) => Response | Promise<Response>;

interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_REDIRECT_URI: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const clientId = context.env.GOOGLE_CLIENT_ID;
  const redirectUri = context.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response("Missing Google OAuth configuration", { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline', // optional, for refresh token
    prompt: 'consent', // force prompt to ensure we get a fresh code
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return Response.redirect(url, 302);
};