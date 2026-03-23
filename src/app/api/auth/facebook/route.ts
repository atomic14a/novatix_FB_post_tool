import { NextResponse } from "next/server";

// GET /api/auth/facebook
// Redirects user to Facebook OAuth login
export async function GET() {
  const appId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/facebook/callback`;

  if (!appId) {
    return NextResponse.json(
      { error: "Facebook App ID not configured" },
      { status: 500 }
    );
  }

  // Request permissions for managing pages and business integrations
  const scope = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "pages_manage_metadata",
    "business_management",
  ].join(",");

  const facebookAuthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;

  return NextResponse.redirect(facebookAuthUrl);
}
