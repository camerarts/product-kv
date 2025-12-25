
interface Env {
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
}

type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
}) => Response | Promise<Response>;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { username, password } = await context.request.json() as any;
    
    const envUser = context.env.ADMIN_USERNAME;
    const envPass = context.env.ADMIN_PASSWORD;

    // 1. 检查环境变量是否已配置
    if (!envUser || !envPass) {
      // 如果未配置环境变量，返回 503，前端将回退到本地验证逻辑
      return new Response(JSON.stringify({ error: "Admin credentials not configured on server" }), { status: 503 });
    }

    // 2. 验证账号密码
    // 简单的字符串比对，生产环境建议使用 Hash，但环境变量配置通常用于简单验证
    if (username === envUser && password === envPass) {
      return new Response(JSON.stringify({ success: true }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};