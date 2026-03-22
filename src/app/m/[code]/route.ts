import { createHash } from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeDisplayDomain(destinationUrl: string, displayDomain?: string | null) {
  if (displayDomain) return displayDomain;

  try {
    return new URL(destinationUrl).hostname;
  } catch {
    return "";
  }
}

function isBotTraffic(userAgent: string) {
  return /(facebookexternalhit|meta-externalagent|facebot|twitterbot|linkedinbot|slackbot|telegrambot|whatsapp|discordbot|bot|crawler|spider)/i.test(userAgent);
}

function buildMetaHtml(params: {
  title: string;
  description: string;
  shortUrl: string;
  destinationUrl: string;
  displayDomain: string;
  ogImage: string;
  imageType: string;
  facebookAppId: string;
}) {
  const {
    title,
    description,
    shortUrl,
    destinationUrl,
    displayDomain,
    ogImage,
    imageType,
    facebookAppId,
  } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(shortUrl)}" />
  <meta property="og:site_name" content="${escapeHtml(displayDomain)}" />
  ${facebookAppId ? `<meta property="fb:app_id" content="${escapeHtml(facebookAppId)}" />` : ""}
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />` : ""}
  ${ogImage ? `<meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />` : ""}
  ${ogImage ? `<meta property="og:image:type" content="${escapeHtml(imageType || "image/png")}" />` : ""}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />` : ""}
  <link rel="canonical" href="${escapeHtml(shortUrl)}">
  <noscript>
    <meta http-equiv="refresh" content="0;url=${escapeHtml(destinationUrl)}">
  </noscript>
</head>
<body>
  <p>Redirecting...</p>
  <script>
    setTimeout(function () {
      window.location.replace(${JSON.stringify(destinationUrl)});
    }, 1200);
  </script>
</body>
</html>`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") || "";
  const proto = requestHeaders.get("x-forwarded-proto") || "https";
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const appUrl = envAppUrl && !envAppUrl.includes("localhost") ? envAppUrl : `${proto}://${host}`;

  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: metaLink, error } = await supabase
    .from("meta_links")
    .select("*")
    .eq("short_code", code)
    .eq("is_active", true)
    .single();

  if (error || !metaLink) {
    return new Response("Short link not found", { status: 404 });
  }

  const userAgent = requestHeaders.get("user-agent") || "";
  const isBot = isBotTraffic(userAgent);

  if (!isBot) {
    if (hasServiceRole) {
      const referer = requestHeaders.get("referer");
      const ipAddress =
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        requestHeaders.get("x-real-ip") ||
        "";
      const ipHash = ipAddress
        ? createHash("sha256").update(ipAddress).digest("hex").slice(0, 24)
        : null;

      await supabase.from("meta_link_clicks").insert({
        meta_link_id: metaLink.id,
        user_id: metaLink.user_id,
        ip_hash: ipHash,
        user_agent: userAgent || null,
        referer: referer || null,
      });

      await supabase
        .from("meta_links")
        .update({
          click_count: (metaLink.click_count || 0) + 1,
          last_clicked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", metaLink.id);
    }

    return NextResponse.redirect(metaLink.destination_url, { status: 302 });
  }

  const shortUrl = `${appUrl}/m/${code}`;
  const displayDomain = normalizeDisplayDomain(metaLink.destination_url, metaLink.display_domain) || host;
  const ogImage = metaLink.image_url || "";
  const facebookAppId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "";
  const html = buildMetaHtml({
    title: metaLink.meta_title || "Meta Link",
    description: metaLink.meta_description || "",
    shortUrl,
    destinationUrl: metaLink.destination_url,
    displayDomain,
    ogImage,
    imageType: metaLink.image_type || "image/png",
    facebookAppId,
  });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
