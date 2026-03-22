"use server";

import { createClient } from "@/lib/supabase/server";

export type Post = {
  id: string;
  user_id: string;
  facebook_page_id: string | null;
  title: string;
  short_text: string | null;
  card_description: string | null;
  destination_url: string | null;
  cta: string | null;
  media_url: string | null;
  media_type: string | null;
  is_fake_video: boolean;
  fake_video_duration: string | null;
  facebook_post_id: string | null;
  facebook_object_id: string | null;
  publish_error: string | null;
  status: "draft" | "published" | "failed";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

// Helper: Publish a post to Facebook using smart logic
async function publishToFacebookGraphApi(
  postId: string,
  pageId: string,
  pageAccessToken: string,
  postData: {
    title: string;
    short_text?: string;
    card_description?: string;
    destination_url?: string;
    media_url?: string;
    cta?: string;
  }
) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    // Robust production check: only fallback if we are CERTAIN we are on a dev machine
    const isLocalhost = !appUrl || appUrl.includes("localhost") || appUrl.includes("127.0.0.1") || appUrl.includes("lhr.life");
    
    console.log(`Publishing post ${postId} from URL: ${appUrl} (isLocalhost: ${isLocalhost})`);

    let endpoint = "";
    let payload = new URLSearchParams();
    payload.append("access_token", pageAccessToken);

    const isImage = !!postData.media_url;
    const isLink = !!postData.destination_url;
    
    // Construct message body (strictly short_text now, previously we weirdly combined title and short_text)
    const messageParts = [];
    if (postData.short_text) messageParts.push(postData.short_text);
    const fullMessage = messageParts.join("\n\n");

    const ctaMap: Record<string, string> = {
      "Learn More": "LEARN_MORE",
      "Shop Now": "SHOP_NOW",
      "Sign Up": "SIGN_UP",
      "Contact Us": "CONTACT_US",
      "Apply Now": "APPLY_NOW"
    };

    if (isLink && !isLocalhost) {
      // Case D: Link Card (using Open Graph Redirect if image exists, or direct link if not)
      endpoint = `https://graph.facebook.com/v21.0/${pageId}/feed`;
      payload.append("message", fullMessage);
      
      // If we have an image, we use our stealth redirect route to force the image into the card
      const linkToPost = isImage ? `${appUrl}/p/${postId}` : postData.destination_url!;
      payload.append("link", linkToPost);
      
      if (postData.cta && ctaMap[postData.cta]) {
        payload.append("call_to_action", JSON.stringify({
          type: ctaMap[postData.cta],
          value: { link: linkToPost }
        }));
      }
    } else if (isImage) {
      // Case C: Image Only (or internal Image fallback for localhost testing)
      endpoint = `https://graph.facebook.com/v21.0/${pageId}/photos`;
      payload.append("url", postData.media_url!);
      
      const captionParts = [fullMessage];
      if (isLink && isLocalhost) {
        // Fallback for localhost testing: append destination URL to the image's text caption
        captionParts.push(postData.destination_url!);
      }
      payload.append("caption", captionParts.filter(Boolean).join("\n\n"));
    } else if (isLink) {
      // Case B: Link Only
      endpoint = `https://graph.facebook.com/v21.0/${pageId}/feed`;
      payload.append("message", fullMessage);
      payload.append("link", postData.destination_url!);
      
      if (postData.cta && ctaMap[postData.cta]) {
        payload.append("call_to_action", JSON.stringify({
          type: ctaMap[postData.cta],
          value: { link: postData.destination_url! }
        }));
      }
    } else {
      // Case A: Text Only
      endpoint = `https://graph.facebook.com/v21.0/${pageId}/feed`;
      payload.append("message", fullMessage);
    }

    const res = await fetch(endpoint, {
      method: "POST",
      body: payload,
    });
    
    const data = await res.json();
    
    if (data.error) {
      console.error("Facebook API Error:", data.error);
      return { success: false, error: data.error.message || "Unknown Facebook Graph API error" };
    }

    return { 
      success: true, 
      post_id: data.post_id || data.id, 
      object_id: data.id // For photos, this is the media id
    };
  } catch (err: any) {
    console.error("Publish execution error:", err);
    return { success: false, error: err.message || "Failed to reach Facebook API" };
  }
}

export async function getPosts(status?: "draft" | "published" | "failed") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("posts")
    .select("*, facebook_pages(page_name)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function getPostById(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("posts")
    .select("*, facebook_pages(page_name, page_id, page_access_token)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return null;
  return data;
}

export async function createPost(formData: {
  facebook_page_id?: string;
  title: string;
  short_text?: string;
  card_description?: string;
  destination_url?: string;
  cta?: string;
  media_url?: string;
  media_type?: string;
  is_fake_video?: boolean;
  fake_video_duration?: string;
  status: "draft" | "published";
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const postPayload: any = {
    user_id: user.id,
    facebook_page_id: formData.facebook_page_id || null,
    title: formData.title || '\u200D', // Hidden space to collapse Facebook title card
    short_text: formData.short_text || null,
    card_description: formData.card_description || null,
    destination_url: formData.destination_url || null,
    cta: formData.cta || null,
    media_url: formData.media_url || null,
    media_type: formData.media_type || null,
    is_fake_video: formData.is_fake_video || false,
    fake_video_duration: formData.fake_video_duration || '0',
    status: formData.status, // Force it to reflect user choice immediately to unlock RLS for Facebook Crawler
    updated_at: new Date().toISOString()
  };

  // Step 1: Insert post to DB to get its ID and explicitly expose it to Facebook Cralwer
  const { data: newPost, error } = await supabase.from("posts").insert(postPayload).select().single();
  if (error) throw error;

  // Step 2: Handle actual publishing
  if (formData.status === "published") {
    if (!formData.facebook_page_id) {
      await supabase.from("posts").update({ status: "failed", publish_error: "Page required." }).eq("id", newPost.id);
      throw new Error("A Facebook Page must be selected to publish.");
    }

    const { data: pageData } = await supabase
      .from("facebook_pages")
      .select("page_id, page_access_token")
      .eq("id", formData.facebook_page_id)
      .eq("user_id", user.id)
      .single();

    if (!pageData || !pageData.page_access_token) {
      await supabase.from("posts").update({ status: "failed", publish_error: "Page unlinked." }).eq("id", newPost.id);
      throw new Error("Invalid or missing Facebook Page connection. Please reconnect your page.");
    }

    // Call Facebook API
    const fbRes = await publishToFacebookGraphApi(
      newPost.id,
      pageData.page_id, 
      pageData.page_access_token, 
      {
        title: formData.title,
        short_text: formData.short_text,
        card_description: formData.card_description,
        destination_url: formData.destination_url,
        media_url: formData.media_url,
        cta: formData.cta
      }
    );

    if (fbRes.success) {
      // Update DB to published
      const updateData = {
        facebook_post_id: fbRes.post_id,
        facebook_object_id: fbRes.object_id,
        status: "published",
        published_at: new Date().toISOString(),
        publish_error: null
      };
      const { data: updatedPost } = await supabase.from("posts").update(updateData).eq("id", newPost.id).select().single();
      return updatedPost;
    } else {
      // Update DB to failed
      await supabase.from("posts").update({
        status: "failed",
        publish_error: fbRes.error
      }).eq("id", newPost.id);
      throw new Error(`Facebook API Error: ${fbRes.error}`);
    }
  }

  return newPost;
}

export async function updatePost(
  id: string,
  formData: Partial<{
    facebook_page_id: string;
    title: string;
    short_text: string;
    card_description: string;
    destination_url: string;
    cta: string;
    media_url: string;
    media_type: string;
    is_fake_video: boolean;
    fake_video_duration: string;
    status: "draft" | "published";
  }>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const postPayload: any = { ...formData, updated_at: new Date().toISOString() };

  if (formData.status === "published") {
    // Force publish the post immediately before hitting API so Crawler is granted RLS SELECT permission
    await supabase.from("posts").update({ status: "published" }).eq("id", id).eq("user_id", user.id);

    const existingPost = await getPostById(id);
    if (!existingPost) throw new Error("Post not found");
    
    const pageIdToUse = formData.facebook_page_id || existingPost.facebook_page_id;
    if (!pageIdToUse) {
      await supabase.from("posts").update({ status: "failed", publish_error: "Page unlinked." }).eq("id", id);
      throw new Error("A Facebook Page must be selected to publish.");
    }

    const { data: pageData } = await supabase
      .from("facebook_pages")
      .select("page_id, page_access_token")
      .eq("id", pageIdToUse)
      .eq("user_id", user.id)
      .single();

    if (!pageData || !pageData.page_access_token) {
      await supabase.from("posts").update({ status: "failed", publish_error: "Page unlinked." }).eq("id", id);
      throw new Error("Invalid or missing Facebook Page connection. Please reconnect your page.");
    }

    const fbPayload = {
      title: formData.title ?? existingPost.title,
      short_text: formData.short_text ?? existingPost.short_text,
      card_description: formData.card_description ?? existingPost.card_description,
      destination_url: formData.destination_url ?? existingPost.destination_url,
      media_url: formData.media_url ?? existingPost.media_url,
      cta: formData.cta ?? existingPost.cta
    };

    const fbRes = await publishToFacebookGraphApi(
      id,
      pageData.page_id, 
      pageData.page_access_token, 
      fbPayload
    );

    if (fbRes.success) {
      postPayload.facebook_post_id = fbRes.post_id;
      postPayload.facebook_object_id = fbRes.object_id;
      postPayload.status = "published";
      postPayload.published_at = new Date().toISOString();
      postPayload.publish_error = null;
    } else {
      postPayload.status = "failed";
      postPayload.publish_error = fbRes.error;
      await supabase.from("posts").update(postPayload).eq("id", id).eq("user_id", user.id);
      throw new Error(`Facebook API Error: ${fbRes.error}`);
    }
  }

  const { data, error } = await supabase.from("posts").update(postPayload).eq("id", id).eq("user_id", user.id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePost(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("posts").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}
