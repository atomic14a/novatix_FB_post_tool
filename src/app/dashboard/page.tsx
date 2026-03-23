"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import {
  Facebook,
  FileText,
  PenSquare,
  Inbox,
  Link2,
  ArrowRight,
  Sparkles,
  MousePointerClick,
} from "lucide-react";

type DashboardPost = {
  id: string;
  title: string;
  short_text: string | null;
  media_url: string | null;
  published_at: string | null;
  updated_at: string;
  facebook_pages?: { page_name?: string | null } | null;
};

type MetaLinkItem = {
  id: string;
  short_code: string;
  meta_title: string;
  meta_description: string | null;
  click_count: number | null;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [stats, setStats] = useState({ pages: 0, drafts: 0, published: 0, metaLinks: 0, clicks: 0 });
  const [recentDrafts, setRecentDrafts] = useState<DashboardPost[]>([]);
  const [recentPublished, setRecentPublished] = useState<DashboardPost[]>([]);
  const [recentMetaLinks, setRecentMetaLinks] = useState<MetaLinkItem[]>([]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [pagesRes, draftsRes, publishedRes, metaLinksRes] = await Promise.all([
          supabase.from("facebook_pages").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase
            .from("posts")
            .select("id, title, short_text, media_url, updated_at, facebook_pages(page_name)")
            .eq("user_id", user.id)
            .eq("status", "draft")
            .order("updated_at", { ascending: false })
            .limit(4),
          supabase
            .from("posts")
            .select("id, title, short_text, media_url, published_at, updated_at, facebook_pages(page_name)")
            .eq("user_id", user.id)
            .eq("status", "published")
            .order("updated_at", { ascending: false })
            .limit(4),
          supabase
            .from("meta_links")
            .select("id, short_code, meta_title, meta_description, click_count, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(4),
        ]);

        const metaLinks = (metaLinksRes.data || []) as MetaLinkItem[];

        setStats({
          pages: pagesRes.count || 0,
          drafts: draftsRes.data?.length || 0,
          published: publishedRes.data?.length || 0,
          metaLinks: metaLinks.length,
          clicks: metaLinks.reduce((sum, link) => sum + (link.click_count || 0), 0),
        });

        setRecentDrafts((draftsRes.data || []) as DashboardPost[]);
        setRecentPublished((publishedRes.data || []) as DashboardPost[]);
        setRecentMetaLinks(metaLinks);
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [supabase]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-xl" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-[420px] rounded-xl" />
          <Skeleton className="h-[420px] rounded-xl" />
        </div>
      </div>
    );
  }

  const setupSteps = [
    { label: "Connect a Facebook page", done: stats.pages > 0, href: "/dashboard/facebook-pages" },
    { label: "Create your first Meta Link", done: stats.metaLinks > 0, href: "/dashboard/meta-links" },
    { label: "Publish a post", done: stats.published > 0, href: "/dashboard/create-post" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Run your Facebook publishing workflow from one place."
      >
        <Button onClick={() => router.push("/dashboard/create-post")} className="gap-2">
          <PenSquare className="h-4 w-4" />
          Publish Post
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Connected Pages" value={stats.pages} icon={Facebook} description="Default page ready to publish" />
        <StatCard title="Meta Links" value={stats.metaLinks} icon={Link2} description="Reusable tracked link cards" />
        <StatCard title="Drafts" value={stats.drafts} icon={FileText} description="Posts waiting to publish" />
        <StatCard title="Tracked Clicks" value={stats.clicks} icon={MousePointerClick} description="Total clicks from recent links" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-primary/15 bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Quick Start
            </CardTitle>
            <CardDescription>
              Best workflow: create a Meta Link first, then publish it to your Facebook page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <button
                onClick={() => router.push("/dashboard/facebook-pages")}
                className="rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
              >
                <p className="text-sm font-semibold">Connect Page</p>
                <p className="mt-1 text-xs text-muted-foreground">Choose the Facebook page you want to publish to.</p>
              </button>
              <button
                onClick={() => router.push("/dashboard/meta-links")}
                className="rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
              >
                <p className="text-sm font-semibold">Create Meta Link</p>
                <p className="mt-1 text-xs text-muted-foreground">Build the clickable preview card with image and title.</p>
              </button>
              <button
                onClick={() => router.push("/dashboard/create-post")}
                className="rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
              >
                <p className="text-sm font-semibold">Publish Post</p>
                <p className="mt-1 text-xs text-muted-foreground">Send your selected Meta Link to Facebook with CTA.</p>
              </button>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Setup Progress</p>
                <Badge variant="secondary">
                  {setupSteps.filter((step) => step.done).length}/{setupSteps.length} complete
                </Badge>
              </div>
              <div className="space-y-2">
                {setupSteps.map((step) => (
                  <Link
                    key={step.label}
                    href={step.href}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm transition hover:border-primary/30 hover:bg-primary/5"
                  >
                    <span className="font-medium">{step.label}</span>
                    <Badge variant={step.done ? "success" : "secondary"}>{step.done ? "Done" : "Open"}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Meta Links</CardTitle>
            <CardDescription>Quick access to the cards you created most recently.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentMetaLinks.length === 0 ? (
              <EmptyState
                icon={Link2}
                title="No Meta Links yet"
                description="Create your first Meta Link to start building clickable Facebook cards."
                actionLabel="Create Meta Link"
                onAction={() => router.push("/dashboard/meta-links")}
              />
            ) : (
              recentMetaLinks.map((link) => {
                const shortUrl = origin ? `${origin}/m/${link.short_code}` : `/m/${link.short_code}`;
                return (
                  <div key={link.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{link.meta_title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {link.meta_description || "No description added."}
                        </p>
                        <p className="mt-2 break-all text-xs text-muted-foreground">{shortUrl}</p>
                      </div>
                      <Badge variant="secondary">{link.click_count || 0} clicks</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(link.created_at)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 px-0 text-primary"
                        onClick={() => router.push(`/dashboard/create-post?meta=${encodeURIComponent(shortUrl)}`)}
                      >
                        Use in Post
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Drafts</h3>
            {recentDrafts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/drafts")}>
                View all
              </Button>
            )}
          </div>
          {recentDrafts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No drafts yet"
              description="Drafts will appear here when you save a post without publishing it."
              actionLabel="Start a Draft"
              onAction={() => router.push("/dashboard/create-post")}
            />
          ) : (
            <div className="space-y-3">
              {recentDrafts.map((post) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  shortText={post.short_text || undefined}
                  mediaUrl={post.media_url}
                  pageName={post.facebook_pages?.page_name || undefined}
                  status="draft"
                  date={formatDate(post.updated_at)}
                  onEdit={() => router.push(`/dashboard/create-post?edit=${post.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Published</h3>
            {recentPublished.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/published")}>
                View all
              </Button>
            )}
          </div>
          {recentPublished.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No published posts"
              description="Once you publish a post, it will appear here with its latest activity."
            />
          ) : (
            <div className="space-y-3">
              {recentPublished.map((post) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  shortText={post.short_text || undefined}
                  mediaUrl={post.media_url}
                  pageName={post.facebook_pages?.page_name || undefined}
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
