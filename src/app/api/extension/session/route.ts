import { createJsonResponse, getExtensionContextFromRequest } from "@/lib/extension/auth";

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getExtensionContextFromRequest(request);
    const body = await request.json();

    const payload = {
      user_id: user.id,
      device_id: body.device_id,
      browser_id: body.browser_id,
      extension_version: body.extension_version || null,
      browser_name: body.browser_name || null,
      platform: body.platform || null,
      is_online: body.is_online ?? true,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("extension_sessions")
      .upsert(payload, { onConflict: "user_id,device_id,browser_id" })
      .select()
      .single();

    if (error) {
      throw error;
    }

    await supabase.from("extension_logs").insert({
      user_id: user.id,
      session_id: data.id,
      log_type: "session_sync",
      message: body.is_online === false ? "Extension disconnected" : "Extension session synced",
      metadata: {
        browser_name: body.browser_name || null,
        platform: body.platform || null,
        extension_version: body.extension_version || null,
      },
    });

    return createJsonResponse({ success: true, session: data });
  } catch (error) {
    return createJsonResponse({ success: false, error: error instanceof Error ? error.message : "Failed to sync session" }, 401);
  }
}
