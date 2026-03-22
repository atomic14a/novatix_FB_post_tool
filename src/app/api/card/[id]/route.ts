import { createClient } from '@supabase/supabase-js';
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

function escapeHtml(unsafe: string) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const host = headersList.get("host") || "";
    
    // Force HTTPS for production metadata
    const appUrl = host ? `https://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

    // Use Service Role Key if available to bypass RLS for the Crawler
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: post, error } = await supabase
      .from('posts')
      .select('title, card_description, media_url, destination_url, is_fake_video')
      .eq('id', id)
      .single();

    if (error || !post) {
      return new Response("Post not found", { status: 404 });
    }

    const ogImageUrl = `${appUrl}/api/og/${id}`;
    
    // Default fallback redirect if no destination URL is provided
    const redirectUrl = post.destination_url || appUrl;
    
    // Use the custom card_description as the site name/domain, fallback to actual destination domain
    let displayDomain = post.card_description || "";
    if (!displayDomain && post.destination_url) {
        try {
            displayDomain = new URL(post.destination_url).hostname;
        } catch(e) { /* ignore Invalid URL */ }
    }
    if (!displayDomain) displayDomain = host;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(post.title || '')}</title>
    
    <!-- Open Graph Data -->
    <meta property="og:title" content="${escapeHtml(post.title || '')}" />
    <meta property="og:description" content="${escapeHtml(post.card_description || '')}" />
    <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${escapeHtml(redirectUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(displayDomain)}" />
    
    <!-- Twitter Card Data -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />
    
    <!-- Canonical Link (Tricks Facebook into using destination domain) -->
    <link rel="canonical" href="${escapeHtml(redirectUrl)}" />
    
    <!-- Immediate Redirects for human visitors -->
    <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}">
</head>
<body>
    <script>
        window.location.replace("${escapeHtml(redirectUrl)}");
    </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (err: any) {
    console.error(`[Raw HTML Card Exception] Post:`, err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
