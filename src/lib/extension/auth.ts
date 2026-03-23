import { createClient } from "@supabase/supabase-js";

export type ExtensionAuthUser = {
  id: string;
  email: string | null;
};

function getExtensionTokenFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    throw new Error("Missing extension bearer token");
  }

  return token;
}

export function createExtensionClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase public client is not configured");
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getExtensionContextFromRequest(request: Request): Promise<{
  user: ExtensionAuthUser;
  token: string;
  supabase: ReturnType<typeof createExtensionClient>;
}> {
  const token = getExtensionTokenFromRequest(request);
  const supabase = createExtensionClient(token);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("Invalid extension session");
  }

  return {
    token,
    supabase,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
  };
}

export function createJsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status });
}
