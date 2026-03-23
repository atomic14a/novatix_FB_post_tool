import { createAdminClient } from "@/lib/supabase/admin";
import { createJsonResponse, getExtensionUserFromRequest } from "@/lib/extension/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getExtensionUserFromRequest(request);
    const body = await request.json();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("extension_job_results")
      .insert({
        job_id: id,
        user_id: user.id,
        result_type: body.result_type || "job_result",
        success: body.success ?? false,
        response_data: body.response_data || {},
        error_message: body.error_message || null,
      })
      .select()
      .single();

    if (error) throw error;

    return createJsonResponse({ success: true, result: data }, 201);
  } catch (error) {
    return createJsonResponse({ success: false, error: error instanceof Error ? error.message : "Failed to save job result" }, 401);
  }
}
