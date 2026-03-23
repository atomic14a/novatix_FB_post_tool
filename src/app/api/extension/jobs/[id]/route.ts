import { createJsonResponse, getExtensionContextFromRequest } from "@/lib/extension/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, supabase } = await getExtensionContextFromRequest(request);
    const body = await request.json();

    const updatePayload: Record<string, unknown> = {
      status: body.status,
      error_log: body.error_log || null,
      updated_at: new Date().toISOString(),
    };

    if (body.status === "processing") {
      updatePayload.started_at = new Date().toISOString();
    }

    if (["completed", "failed", "cancelled"].includes(body.status)) {
      updatePayload.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("extension_jobs")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("extension_logs").insert({
      user_id: user.id,
      session_id: body.session_id || null,
      log_type: "job_status",
      message: `Job ${id} updated to ${body.status}`,
      metadata: {
        status: body.status,
        error_log: body.error_log || null,
      },
    });

    return createJsonResponse({ success: true, job: data });
  } catch (error) {
    return createJsonResponse({ success: false, error: error instanceof Error ? error.message : "Failed to update job" }, 401);
  }
}
