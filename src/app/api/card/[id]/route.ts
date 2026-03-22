import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getMetaCode(destinationUrl: string | null, appUrl: string) {
  if (!destinationUrl) return null;

  try {
    const parsedUrl = new URL(destinationUrl, appUrl);
    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    if (segments[0] === "m" && segments[1]) {
      return segments[1];
    }
  } catch {
    return null;
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const appUrl = host ? `https://${host}` : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const wrapperUrl = `${appUrl}/api/card/${id}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: post, error } = await supabase
      .from("posts")
      .select("title, card_description, media_url, destination_url, is_fake_video")
      .eq("id", id)
      .single();

    if (error || !post) {
      return new Response("Post not found", { status: 404 });
    }

    const metaCode = getMetaCode(post.destination_url, appUrl);
    let metaLink: {
      meta_title: string | null;
      meta_description: string | null;
      image_url: string | null;
      display_domain: string | null;
    } | null = null;

    if (metaCode) {
      const { data } = await supabase
        .from("meta_links")
        .select("meta_title, meta_description, image_url, display_domain")
        .eq("short_code", metaCode)
        .eq("is_active", true)
        .single();

      metaLink = data;
    }

    const redirectUrl = post.destination_url || appUrl;
    const ogTitle = post.title?.trim() || metaLink?.meta_title || "";
    const ogDescription = metaLink?.meta_description || "";

    let displayDomain = post.card_description?.trim() || metaLink?.display_domain || "";
    if (!displayDomain && redirectUrl) {
      try {
        displayDomain = new URL(redirectUrl).hostname;
      } catch {
        displayDomain = host;
      }
    }

    let ogImageUrl = "";
    if (post.media_url) {
      ogImageUrl = post.is_fake_video ? `${appUrl}/api/og/${id}` : post.media_url;
    } else if (metaCode && metaLink?.image_url) {
      ogImageUrl = `${appUrl}/api/meta-image/${metaCode}`;
    }

    const imageMeta = ogImageUrl
      ? `
    <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(ogImageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />`
      : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(ogTitle)}</title>
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(ogDescription)}" />
    <meta property="og:url" content="${escapeHtml(wrapperUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(displayDomain)}" />${imageMeta}
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="${escapeHtml(wrapperUrl)}" />
    <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}">
</head>
<body>
    <script>
        window.location.replace(${JSON.stringify(redirectUrl)});
    </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("[Raw HTML Card Exception]", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
