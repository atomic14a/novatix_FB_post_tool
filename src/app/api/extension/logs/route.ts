import { createJsonResponse, getExtensionContextFromRequest } from "@/lib/extension/auth";

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getExtensionContextFromRequest(request);
    const body = await request.json();

    const { data, error } = await supabase
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
