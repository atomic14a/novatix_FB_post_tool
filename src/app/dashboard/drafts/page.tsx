"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { FileText, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DraftsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<any[]>([]);

  useEffect(() => {
    loadDrafts();
  }, []);

  async function loadDrafts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("posts")
        .select("*, facebook_pages(page_name)")
        .eq("user_id", user.id)
        .eq("status", "draft")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error("Error loading drafts:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Draft deleted");
      loadDrafts();
    } catch (error) {
      toast.error("Failed to delete draft");
    }
  };

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
        <Skeleton className="h-8 w-32" />
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
        title="Drafts"
        description={`${drafts.length} draft${drafts.length !== 1 ? "s" : ""} saved`}
      >
        <Button onClick={() => router.push("/dashboard/create-post")} className="gap-2">
          <PenSquare className="h-4 w-4" />
          Create Post
        </Button>
      </PageHeader>

      {drafts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No drafts yet"
          description="Your saved drafts will appear here. Create a post and save it as a draft."
          actionLabel="Create Post"
          onAction={() => router.push("/dashboard/create-post")}
        />
      ) : (
        <div className="space-y-3">
          {drafts.map((post: any) => (
            <PostCard
              key={post.id}
              id={post.id}
              title={post.title}
              shortText={post.short_text}
              mediaUrl={post.media_url}
              pageName={post.facebook_pages?.page_name}
              status="draft"
              date={formatDate(post.updated_at)}
              onEdit={(id) => router.push(`/dashboard/create-post?edit=${id}`)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
