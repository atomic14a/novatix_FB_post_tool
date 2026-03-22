"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { Send, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublishedPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    async function loadPublished() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("posts")
          .select("*, facebook_pages(page_name)")
          .eq("user_id", user.id)
          .eq("status", "published")
          .order("published_at", { ascending: false });

        if (error) throw error;
        setPosts(data || []);
      } catch (error) {
        console.error("Error loading published posts:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPublished();
  }, [supabase]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Published Posts"
        description={`${posts.length} post${posts.length !== 1 ? "s" : ""} published`}
      >
        <Button onClick={() => router.push("/dashboard/create-post")} className="gap-2">
          <PenSquare className="h-4 w-4" />
          Create Post
        </Button>
      </PageHeader>

      {posts.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No published posts"
          description="Your published posts will appear here. Create and publish a post to get started."
          actionLabel="Create Post"
          onAction={() => router.push("/dashboard/create-post")}
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post: any) => (
            <PostCard
              key={post.id}
              id={post.id}
              title={post.title}
              shortText={post.short_text}
              mediaUrl={post.media_url}
              pageName={post.facebook_pages?.page_name}
              status="published"
              date={formatDate(post.published_at || post.updated_at)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
