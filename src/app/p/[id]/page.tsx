import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "";
  
  // Force HTTPS for production metadata
  const appUrl = host ? `https://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

  // Use Service Role Key if available to bypass RLS for the Crawler
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select('title, card_description, media_url, is_fake_video')
      .eq('id', id)
      .single();

    if (error || !post) {
      console.error(`[Metadata Error] Post ${id} not found:`, error);
      return { title: 'Post Preview' };
    }

    const ogImageUrl = `${appUrl}/api/og/${id}`;
    const displayDomain = post.card_description || host;

    return {
      title: post.title || 'Post Preview',
      description: post.card_description || '',
      openGraph: {
        title: post.title || 'Post Preview',
        description: post.card_description || '',
        url: `${appUrl}/p/${id}`,
        siteName: displayDomain, // Mask the site name with the Display URL (Fewfeed style)
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: post.title || 'Post Image',
          },
        ],
        type: 'website',
      },
      twitter: {
        title: post.title || 'Post Preview',
        description: post.card_description || '',
        images: [ogImageUrl],
      },
    };
  } catch (err: any) {
    console.error(`[Metadata Exception] Post ${id}:`, err);
    return { title: 'Post Preview' };
  }
}

export default async function OpenGraphRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Always use Service Role for internal redirects to ensure 0% RLS failure
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: post, error } = await supabase
    .from('posts')
    .select('destination_url')
    .eq('id', id)
    .single();

  if (error || !post || !post.destination_url) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-xl text-muted-foreground">This post has no external link or was not found.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
      <p className="text-muted-foreground mb-4">
        Taking you to the destination. If you are not redirected automatically, please click below.
      </p>
      <a 
        href={post.destination_url}
        className="text-primary hover:underline font-medium"
      >
        {post.destination_url}
      </a>
      <script dangerouslySetInnerHTML={{ __html: `window.location.replace("${post.destination_url}");` }} />
    </div>
  );
}
