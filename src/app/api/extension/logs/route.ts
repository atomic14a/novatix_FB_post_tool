import { createAdminClient } from "@/lib/supabase/admin";
import { createJsonResponse, getExtensionUserFromRequest } from "@/lib/extension/auth";

export async function POST(request: Request) {
  try {
    const user = await getExtensionUserFromRequest(request);
    const body = await request.json();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("extension_logs")
      .insert({
        user_id: user.id,
        session_id: body.session_id || null,
        log_type: body.log_type || "activity",
        message: body.message || "Extension activity",
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    return createJsonResponse({ success: true, log: data }, 201);
  } catch (error) {
    return createJsonResponse({ success: false, error: error instanceof Error ? error.message : "Failed to save log" }, 401);
  }
}
