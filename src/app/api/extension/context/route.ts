import { createJsonResponse, getExtensionContextFromRequest } from "@/lib/extension/auth";

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getExtensionContextFromRequest(request);
    const body = await request.json();

    const payload = {
      user_id: user.id,
      session_id: body.session_id || null,
      facebook_detected: body.facebook_detected ?? false,
      facebook_logged_in: body.facebook_logged_in ?? false,
      account_name: body.account_name || null,
      page_name: body.page_name || null,
      page_id: body.page_id || null,
      detected_pages_count: body.detected_pages_count || 0,
      context_data: body.context_data || {},
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let existingQuery = supabase
      .from("extension_facebook_contexts")
      .select("id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    existingQuery = body.session_id
      ? existingQuery.eq("session_id", body.session_id)
      : existingQuery.is("session_id", null);

    const existing = await existingQuery;
    if (existing.error) throw existing.error;

    const query = existing.data && existing.data[0]?.id
      ? supabase.from("extension_facebook_contexts").update(payload).eq("id", existing.data[0].id)
      : supabase.from("extension_facebook_contexts").insert(payload);

    const { data, error } = await query.select().single();
    if (error) throw error;

    await supabase.from("extension_logs").insert({
      user_id: user.id,
      session_id: body.session_id || null,
      log_type: "facebook_context_sync",
      message: "Facebook context synced from extension",
      metadata: {
        facebook_detected: body.facebook_detected ?? false,
        page_name: body.page_name || null,
        page_id: body.page_id || null,
      },
    });

    return createJsonResponse({ success: true, context: data });
  } catch (error) {
    return createJsonResponse({ success: false, error: error instanceof Error ? error.message : "Failed to sync context" }, 401);
  }
}
