import { createClient } from "@/lib/supabase/server";
import { type NextRequest } from "next/server";

// Helper to return a script that closes the popup and sends a message to the opener
function postMessageAndClose(type: "FB_AUTH_SUCCESS" | "FB_AUTH_ERROR", payload?: any) {
  const message = JSON.stringify({ type, ...payload });
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Facebook Authentication</title>
      </head>
      <body>
        <p>Completing authentication...</p>
        <script>
          if (window.opener) {
            window.opener.postMessage(${message}, "${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}");
          }
          window.close();
        </script>
      </body>
    </html>
  `;
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

// GET /api/auth/facebook/callback
// Handles the OAuth callback from Facebook
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error || !code) {
    return postMessageAndClose("FB_AUTH_ERROR", { error: error || "no_code" });
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = `${appUrl}/api/auth/facebook/callback`;

  if (!appId || !appSecret) {
    return postMessageAndClose("FB_AUTH_ERROR", { error: "app_not_configured" });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return postMessageAndClose("FB_AUTH_ERROR", { error: "unauthenticated" });
    }

    // 1. Exchange code for user access token
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token exchange error:", tokenData.error);
      return postMessageAndClose("FB_AUTH_ERROR", { error: "token_exchange_failed" });
    }

    const userAccessToken = tokenData.access_token;

    // 2. Get long-lived user token
    const longLivedUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userAccessToken}`;

    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = await longLivedRes.json();
    const longLivedToken = longLivedData.access_token || userAccessToken;

    // 3. Get user's Facebook account info
    const accountUrl = `https://graph.facebook.com/v21.0/me?access_token=${longLivedToken}&fields=id,name`;
    const accountRes = await fetch(accountUrl);
    const accountData = await accountRes.json();

    if (accountData.error) {
      console.error("Account fetch error:", accountData.error);
      return postMessageAndClose("FB_AUTH_ERROR", { error: "account_fetch_failed" });
    }

    // Upsert Facebook Account in DB
    // First check if it exists for this user to update or insert
    const { data: existingAccount } = await supabase
      .from("facebook_accounts")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingAccount) {
      await supabase.from("facebook_accounts").update({
        facebook_account_id: accountData.id,
        facebook_account_name: accountData.name,
        access_token: longLivedToken,
        updated_at: new Date().toISOString()
      }).eq("id", existingAccount.id);
    } else {
      await supabase.from("facebook_accounts").insert({
        user_id: user.id,
        facebook_account_id: accountData.id,
        facebook_account_name: accountData.name,
        access_token: longLivedToken
      });
    }

    // 4. Get user's pages
    const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}&fields=id,name,access_token,category,fan_count,picture{url}`;

    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      console.error("Pages fetch error:", pagesData.error);
      return postMessageAndClose("FB_AUTH_ERROR", { error: "pages_fetch_failed" });
    }

    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return postMessageAndClose("FB_AUTH_SUCCESS", { count: 0 }); // Successfully connected but no pages
    }

    // Save pages to Supabase
    // Get existing pages for this user
    const { data: existingPages } = await supabase
      .from("facebook_pages")
      .select("page_id")
      .eq("user_id", user.id);

    const existingPageIds = new Set(
      existingPages?.map((p) => p.page_id) || []
    );

    // Check if user has any default page
    const { data: defaultCheck } = await supabase
      .from("facebook_pages")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .limit(1);

    const hasDefault = (defaultCheck?.length || 0) > 0;
    let firstNew = true;

    // Insert new pages, skip existing
    for (const page of pages) {
      if (existingPageIds.has(page.id)) {
        // Update token for existing page
        await supabase
          .from("facebook_pages")
          .update({
            page_access_token: page.access_token,
            page_name: page.name,
            status: "connected",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("page_id", page.id);
      } else {
        // Insert new page
        await supabase.from("facebook_pages").insert({
          user_id: user.id,
          page_name: page.name,
          page_id: page.id,
          page_access_token: page.access_token,
          is_default: !hasDefault && firstNew, // First new page becomes default if no default exists
          status: "connected",
        });
        firstNew = false;
      }
    }

    return postMessageAndClose("FB_AUTH_SUCCESS", { count: pages.length });
  } catch (error) {
    console.error("Facebook OAuth error:", error);
    return postMessageAndClose("FB_AUTH_ERROR", { error: "oauth_failed" });
  }
}
