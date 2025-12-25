
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
}) => Response | Promise<Response>;

interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  VISION_KV: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(`Google Auth Error: ${error}`, { status: 400 });
  }

  if (!code) {
    return new Response("Missing authorization code", { status: 400 });
  }

  const clientId = context.env.GOOGLE_CLIENT_ID;
  const clientSecret = context.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = context.env.GOOGLE_REDIRECT_URI;

  try {
    // 1. Exchange Code for Token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData: any = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
    }

    // 2. Get User Info from Google
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData: any = await userResponse.json();
    if (!userResponse.ok) {
      throw new Error(`User info fetch failed: ${JSON.stringify(userData)}`);
    }

    // 3. Process User Data (KV)
    const userId = userData.sub; // Google unique ID
    const now = Date.now();

    // Check if user exists to set firstLoginAt
    const existingUserStr = await context.env.VISION_KV.get(`user:${userId}`);
    let userProfile = {
      id: userId,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      firstLoginAt: now,
      lastLoginAt: now,
    };

    if (existingUserStr) {
      const existingUser = JSON.parse(existingUserStr);
      userProfile.firstLoginAt = existingUser.firstLoginAt; // Keep original first login
    }

    // Save/Update User
    await context.env.VISION_KV.put(`user:${userId}`, JSON.stringify(userProfile));

    // 4. Create Session
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId: userId,
      email: userData.email,
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    // Store Session in KV (Expire in 7 days)
    await context.env.VISION_KV.put(`session:${sessionId}`, JSON.stringify(sessionData), {
      expirationTtl: 7 * 24 * 60 * 60,
    });

    // 5. Set Cookie and Redirect
    const headers = new Headers();
    // Use Secure; HttpOnly; SameSite=Lax for security
    // In local dev (localhost), Secure might prevent cookies if not HTTPS, but Cloudflare Pages defaults to HTTPS.
    // We conditionally apply 'Secure' if protocol matches, but typically handled by browser.
    // For wider compatibility in this demo, we use Path=/; HttpOnly; SameSite=Lax; Max-Age=604800
    const cookie = `auth_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800; Secure`;
    
    headers.append("Set-Cookie", cookie);
    headers.append("Location", "/"); // Redirect to home

    return new Response(null, {
      status: 302,
      headers: headers,
    });

  } catch (err: any) {
    return new Response(`Authentication Failed: ${err.message}`, { status: 500 });
  }
};