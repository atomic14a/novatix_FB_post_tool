import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const [{ data: sessionData }, { data: userData }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  const session = sessionData.session;
  const user = userData.user;

  if (!session || !user) {
    return Response.json({ success: true, session: null, user: null }, { status: 200 });
  }

  return Response.json({
    success: true,
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      token_type: session.token_type,
      user,
    },
    user: {
      id: user.id,
      email: user.email ?? null,
    },
  });
}
