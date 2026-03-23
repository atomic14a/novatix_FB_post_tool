import { createAdminClient } from "@/lib/supabase/admin";

export type ExtensionAuthUser = {
  id: string;
  email: string | null;
};

export async function getExtensionUserFromRequest(request: Request): Promise<ExtensionAuthUser> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    throw new Error("Missing extension bearer token");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("Invalid extension session");
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}

export function createJsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status });
}
