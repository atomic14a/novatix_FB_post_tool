"use server";

import { createClient } from "@/lib/supabase/server";

export async function refreshFacebookPages() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    // Get the connected Facebook account
    const { data: account } = await supabase
      .from("facebook_accounts")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!account || !account.access_token) {
      return { error: "No Facebook account connected. Please connect your account first." };
    }

    const { access_token } = account;

    // Fetch pages from Facebook Graph API
    const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${access_token}&fields=id,name,access_token,category,fan_count,picture{url}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      console.error("Pages fetch error during refresh:", pagesData.error);
      return { error: "Failed to fetch pages from Facebook. Your token might be expired. Please reconnect." };
    }

    const pages = pagesData.data || [];

    // Get existing pages from DB
    const { data: existingPages } = await supabase
      .from("facebook_pages")
      .select("page_id")
      .eq("user_id", user.id);

    const existingPageIds = new Set(existingPages?.map((p) => p.page_id) || []);

    // Check if user has any default page
    const { data: defaultCheck } = await supabase
      .from("facebook_pages")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .limit(1);

    let hasDefault = (defaultCheck?.length || 0) > 0;

    let updatedCount = 0;
    let addedCount = 0;

    // Make sure we update existing and insert new
    for (const page of pages) {
      if (existingPageIds.has(page.id)) {
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
        updatedCount++;
      } else {
        await supabase.from("facebook_pages").insert({
          user_id: user.id,
          page_name: page.name,
          page_id: page.id,
          page_access_token: page.access_token,
          is_default: !hasDefault, 
          status: "connected",
        });
        hasDefault = true; 
        addedCount++;
      }
    }

    return { 
      success: true, 
      added: addedCount, 
      updated: updatedCount,
      total: pages.length
    };
  } catch (error: any) {
    console.error("Refresh error:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}

export async function disconnectFacebookAccount() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    // Delete facebook_accounts (removes the main connection)
    await supabase.from("facebook_accounts").delete().eq("user_id", user.id);

    // Delete all facebook_pages linked to the user
    await supabase.from("facebook_pages").delete().eq("user_id", user.id);

    return { success: true };
  } catch (error: any) {
    console.error("Disconnect error:", error);
    return { error: error.message || "Failed to disconnect account." };
  }
}
