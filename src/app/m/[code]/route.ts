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

function normalizeImageType(imageType?: string | null, imageUrl?: string | null) {
  if (imageType && /^[a-z]+\/[a-z0-9.+-]+$/i.test(imageType) && !imageType.endsWith("/external")) {
    return imageType;
  }

  const normalizedUrl = (imageUrl || "").toLowerCase().split("?")[0].split("#")[0];

  if (normalizedUrl.endsWith(".png")) return "image/png";
  if (normalizedUrl.endsWith(".webp")) return "image/webp";
  if (normalizedUrl.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
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
  ${ogImage ? `<meta property="og:image:type" content="${escapeHtml(imageType || "image/jpeg")}" />` : ""}
  ${ogImage ? `<meta property="og:image:width" content="1200" />` : ""}
  ${ogImage ? `<meta property="og:image:height" content="630" />` : ""}
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: metaLink, error } = await supabase
    .from("meta_links")
    .select("id, user_id, destination_url, display_domain, image_url, image_type, meta_title, meta_description, is_active")
    .eq("short_code", code)
    .eq("is_active", true)
    .single();

  if (error || !metaLink) {
    return new Response("Short link not found", { status: 404 });
  }

  const userAgent = requestHeaders.get("user-agent") || "";
  const isBot = isBotTraffic(userAgent);

  if (!isBot) {
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
    imageType: normalizeImageType(metaLink.image_type, metaLink.image_url),
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
