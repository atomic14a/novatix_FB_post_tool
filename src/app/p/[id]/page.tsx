import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select('title, card_description, media_url, is_fake_video')
      .eq('id', params.id)
      .single();

    if (error || !post) {
      return { title: 'Post Not Found' };
    }

    const ogImageUrl = `${appUrl}/api/og/${params.id}`;

    return {
      title: post.title || 'Novatix FB Tool',
      description: post.card_description || '',
      openGraph: {
        title: post.title || 'Novatix FB Tool',
        description: post.card_description || '',
        url: `${appUrl}/p/${params.id}`,
        siteName: 'Novatix FB Tool',
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
        title: post.title || 'Novatix FB Tool',
        description: post.card_description || '',
        images: [ogImageUrl],
      },
    };
  } catch (err: any) {
    console.error("Metadata generation error:", err);
    return { title: `Error: ${err?.message || 'Unknown'}` };
  }
}

export default async function OpenGraphRedirectPage({ params }: { params: { id: string } }) {
  const { data: post, error } = await supabase.from('posts').select('destination_url').eq('id', params.id).single();

  if (error || !post || !post.destination_url) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-xl text-muted-foreground">This post has no external link.</p>
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
