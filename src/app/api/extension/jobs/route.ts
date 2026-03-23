import { createAdminClient } from "@/lib/supabase/admin";
import { createJsonResponse, getExtensionUserFromRequest } from "@/lib/extension/auth";

export async function GET(request: Request) {
  try {
    const user = await getExtensionUserFromRequest(request);
    const admin = createAdminClient();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("session_id");

    let query = admin
      .from("extension_jobs")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "assigned"])
      .order("created_at", { ascending: true })
      .limit(1);

    if (sessionId) {
      query = query.or(`assigned_session_id.is.null,assigned_session_id.eq.${sessionId}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const job = data?.[0];
    if (!job) {
      return createJsonResponse({ success: true, job: null });
    }

    const updatePayload: Record<string, unknown> = {
      status: job.status === "pending" ? "assigned" : job.status,
      updated_at: new Date().toISOString(),
    };

    if (sessionId) {
      updatePayload.assigned_session_id = sessionId;
    }

    if (job.status === "pending") {
      await admin
        .from("extension_jobs")
        .update(updatePayload)
        .eq("id", job.id)
        .eq("user_id", user.id);

      await admin.from("extension_logs").insert({
        user_id: user.id,
        session_id: sessionId,
        log_type: "job_assigned",
        message: `Job ${job.id} assigned to extension`,
        metadata: {
          job_type: job.job_type,
          execution_mode: job.execution_mode,
        },
      });
    }

    return createJsonResponse({ success: true, job: { ...job, ...updatePayload } });
  } catch (error) {
    return createJsonResponse({ success: false, error: error instanceof Error ? error.message : "Failed to fetch jobs" }, 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getExtensionUserFromRequest(request);
    const admin = createAdminClient();
    const body = await request.json();

    const payload = {
      user_id: user.id,
      page_id: body.page_id || null,
      post_id: body.post_id || null,
      job_type: body.job_type || "test_publish",
      execution_mode: body.execution_mode || "manual_test",
      payload: body.payload || {},
      status: body.status || "pending",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from("extension_jobs")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    await admin.from("extension_logs").insert({
      user_id: user.id,
      log_type: "job_created",
      message: `Job ${data.id} created from extension endpoint`,
      metadata: {
        job_type: data.job_type,
        execution_mode: data.execution_mode,
      },
    });

    return createJsonResponse({ success: true, job: data }, 201);
  } catch (error) {
    return createJsonResponse({ success: false, error: error instanceof Error ? error.message : "Failed to create job" }, 401);
  }
}
