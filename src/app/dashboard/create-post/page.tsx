"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { MediaUploader } from "@/components/media-uploader";
import { PostPreview } from "@/components/post-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { createPost, updatePost } from "@/lib/actions/posts";
import { Save, Send, Loader2, Play } from "lucide-react";
import { toast } from "sonner";

const CTA_OPTIONS = [
  { value: "", label: "No CTA" },
  { value: "Learn More", label: "Learn More" },
  { value: "Shop Now", label: "Shop Now" },
  { value: "Sign Up", label: "Sign Up" },
  { value: "Contact Us", label: "Contact Us" },
  { value: "Apply Now", label: "Apply Now" },
];

function CreatePostLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

const CreatePostContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const supabase = createClient();

  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pages, setPages] = useState<any[]>([]);

  // Form state
  const [selectedPage, setSelectedPage] = useState("");
  const [title, setTitle] = useState("");
  const [shortText, setShortText] = useState("");
  const [cardDescription, setCardDescription] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [cta, setCta] = useState("");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [selectedPageName, setSelectedPageName] = useState("");
  const [isFakeVideo, setIsFakeVideo] = useState(true);
  const [fakeVideoDuration, setFakeVideoDuration] = useState("0");

  // Load pages + optionally load edit data
  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load pages
        const { data: pagesData } = await supabase
          .from("facebook_pages")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false });

        setPages(pagesData || []);

        // Set default page
        const defaultPage = pagesData?.find((p: any) => p.is_default);
        if (defaultPage) {
          setSelectedPage(defaultPage.id);
          setSelectedPageName(defaultPage.page_name);
        }

        // Load edit data if editing
        if (editId) {
          const { data: post } = await supabase
            .from("posts")
            .select("*")
            .eq("id", editId)
            .eq("user_id", user.id)
            .single();

          if (post) {
            setSelectedPage(post.facebook_page_id || "");
            setTitle(post.title || "");
            setShortText(post.short_text || "");
            setCardDescription(post.card_description || "");
            setDestinationUrl(post.destination_url || "");
            setIsFakeVideo(post.is_fake_video || false);
            setFakeVideoDuration(post.fake_video_duration || "0");
            setMediaUrl(post.media_url || null);
            setMediaPreview(post.media_url || null);
            setMediaType(post.media_type || null);
            setCta(post.cta || "");
            if (post.facebook_page_id) {
              const page = pagesData?.find((p: any) => p.id === post.facebook_page_id);
              if (page) setSelectedPageName(page.page_name);
            }
          }
        }
      } catch (error) {
        console.error("Init error:", error);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [editId, supabase]);

  const handlePageChange = (pageId: string) => {
    setSelectedPage(pageId);
    const page = pages.find((p: any) => p.id === pageId);
    setSelectedPageName(page?.page_name || "");
  };

  const handleFileSelect = useCallback(async (file: File) => {
    // Show local preview immediately
    const previewUrl = URL.createObjectURL(file);
    setMediaPreview(previewUrl);
    setMediaType(file.type);
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const fileExtension = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExtension}`;

      const { data, error } = await supabase.storage
        .from("post-media")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("post-media")
        .getPublicUrl(data.path);

      setMediaUrl(publicUrl);
      toast.success("Media uploaded!");
    } catch (error) {
      toast.error("Upload failed. Media will be stored locally for preview.");
    } finally {
      setUploading(false);
    }
  }, [supabase]);

  const handleRemoveMedia = () => {
    setMediaPreview(null);
    setMediaType(null);
    setMediaUrl(null);
  };

  const handleSave = async (status: "draft" | "published") => {
    const isPublish = status === "published";
    isPublish ? setPublishing(true) : setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const postData = {
        facebook_page_id: selectedPage || undefined,
        title: title.trim() || "\u200d", 
        short_text: shortText.trim() || undefined,
        card_description: cardDescription.trim() || undefined,
        destination_url: destinationUrl.trim() || undefined,
        cta: cta || undefined,
        media_url: mediaUrl || undefined,
        media_type: mediaType || undefined,
        is_fake_video: isFakeVideo,
        fake_video_duration: fakeVideoDuration || '0',
        status: status,
      };

      if (editId) {
        await updatePost(editId, postData);
      } else {
        await createPost(postData);
      }

      toast.success(
        isPublish
          ? "Post published successfully to Facebook!"
          : "Draft saved successfully!"
      );

      router.push(isPublish ? "/dashboard/published" : "/dashboard/drafts");
    } catch (error: any) {
      console.error("Save/Publish error:", error);
      toast.error(error.message || `Failed to ${isPublish ? "publish" : "save"} post`);
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  if (loading) {
    return <CreatePostLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={editId ? "Edit Post" : "Create Post"}
        description={editId ? "Update your post content" : "Create and publish content to your Facebook page"}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Page Selection */}
          <div className="space-y-2">
            <Label htmlFor="page">Facebook Page</Label>
            <Select
              id="page"
              value={selectedPage}
              onChange={(e) => handlePageChange(e.target.value)}
            >
              <option value="">Select a page</option>
              {pages.map((page: any) => (
                <option key={page.id} value={page.id}>
                  {page.page_name} {page.is_default ? "(Default)" : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Card Title :</Label>
            <Input
              id="title"
              placeholder="e.g. HD"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Message / Short Text */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shortText">Message :</Label>
            <Textarea
              id="shortText"
              placeholder="Write something..."
              value={shortText}
              onChange={(e) => setShortText(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destinationUrl">Destination URL :</Label>
            <Input
              id="destinationUrl"
              placeholder="Your target website"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardDescription">Display URL :</Label>
            <Input
              id="cardDescription"
              placeholder="facebook.com"
              value={cardDescription}
              onChange={(e) => setCardDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cta">Call to Action (Optional Button)</Label>
            <Select
              id="cta"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
            >
              {CTA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 h-11"
              onClick={() => handleSave("draft")}
              disabled={saving || publishing}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Draft
            </Button>
            <Button
              className="flex-1 gap-2 h-11"
              onClick={() => handleSave("published")}
              disabled={saving || publishing}
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publish Now
            </Button>
          </div>
        </div>

        {/* Right: Media Upload + Preview */}
        <div className="space-y-6">
          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Media</Label>
            <MediaUploader
              onFileSelect={handleFileSelect}
              currentPreview={mediaPreview}
              currentType={mediaType}
              onRemove={handleRemoveMedia}
            />
            {uploading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Uploading media...
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            {/* Live Preview UI strictly modeled strictly after Fewfeed layout */}
          <div className="border bg-card rounded-lg overflow-hidden shadow-sm">
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                {selectedPageName ? selectedPageName.substring(0, 1).toUpperCase() : "S"}
              </div>
              <div>
                <div className="font-semibold text-sm leading-tight">{selectedPageName || "Your Page"}</div>
                <div className="text-xs text-muted-foreground">Just now · 🌍</div>
              </div>
            </div>

            {shortText && (
              <div className="px-4 pb-3 text-[15px] whitespace-pre-wrap">{shortText}</div>
            )}

            {mediaPreview && (
              <div className="border-t border-b overflow-hidden relative group">
                <div className="aspect-[1.91/1] w-full bg-muted flex items-center justify-center relative">
                  {mediaType && mediaType.startsWith('video') ? (
                    <video src={mediaPreview} className="w-full h-full object-cover" controls={false} />
                  ) : (
                    <img src={mediaPreview} className="w-full h-full object-cover" alt="Post media" />
                  )}
                </div>
                
                {/* Fake Play Button Overlay */}
                {isFakeVideo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/40 rounded-full w-16 h-16 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                      <Play className="w-8 h-8 text-white translate-x-0.5" fill="currentColor" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {(cardDescription || destinationUrl) && (
              <div className="p-3 bg-muted/10 border-t">
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  {cardDescription || 'yourdomain.com'}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={<CreatePostLoading />}>
      <CreatePostContent />
    </Suspense>
  );
}
