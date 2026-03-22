"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import {
  Facebook,
  FileText,
  Send,
  PenSquare,
  Inbox,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pages: 0, drafts: 0, published: 0 });
  const [recentDrafts, setRecentDrafts] = useState<any[]>([]);
  const [recentPublished, setRecentPublished] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch stats
        const [pagesRes, draftsRes, publishedRes] = await Promise.all([
          supabase.from("facebook_pages").select("id", { count: "exact" }).eq("user_id", user.id),
          supabase.from("posts").select("*, facebook_pages(page_name)").eq("user_id", user.id).eq("status", "draft").order("updated_at", { ascending: false }).limit(5),
          supabase.from("posts").select("*, facebook_pages(page_name)").eq("user_id", user.id).eq("status", "published").order("updated_at", { ascending: false }).limit(5),
        ]);

        setStats({
          pages: pagesRes.count || 0,
          drafts: draftsRes.data?.length || 0,
          published: publishedRes.data?.length || 0,
        });

        setRecentDrafts(draftsRes.data || []);
        setRecentPublished(publishedRes.data || []);
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
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
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's an overview of your content."
      >
        <Button onClick={() => router.push("/dashboard/create-post")} className="gap-2">
          <PenSquare className="h-4 w-4" />
          Create New Post
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Connected Pages"
          value={stats.pages}
          icon={Facebook}
          description="Facebook pages linked"
        />
        <StatCard
          title="Drafts"
          value={stats.drafts}
          icon={FileText}
          description="Posts saved as drafts"
        />
        <StatCard
          title="Published Posts"
          value={stats.published}
          icon={Send}
          description="Posts published"
        />
      </div>

      {/* Recent Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Drafts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Drafts</h3>
            {recentDrafts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard/drafts")}
              >
                View all
              </Button>
            )}
          </div>
          {recentDrafts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No drafts yet"
              description="Create your first post to see drafts here."
              actionLabel="Create Post"
              onAction={() => router.push("/dashboard/create-post")}
            />
          ) : (
            <div className="space-y-3">
              {recentDrafts.map((post: any) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  shortText={post.short_text}
                  mediaUrl={post.media_url}
                  pageName={post.facebook_pages?.page_name}
                  status="draft"
                  date={formatDate(post.updated_at)}
                  onEdit={() => router.push(`/dashboard/create-post?edit=${post.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Published */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Published</h3>
            {recentPublished.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard/published")}
              >
                View all
              </Button>
            )}
          </div>
          {recentPublished.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No published posts"
              description="Your published posts will appear here."
            />
          ) : (
            <div className="space-y-3">
              {recentPublished.map((post: any) => (
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
      </div>
    </div>
  );
}
