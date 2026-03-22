"use client";

import { Globe, ThumbsUp, MessageCircle, Share2, ImageIcon } from "lucide-react";

interface PostPreviewProps {
  pageName?: string;
  title?: string;
  shortText?: string;
  destinationUrl?: string;
  cta?: string;
  mediaPreview?: string | null;
  mediaType?: string | null;
}

export function PostPreview({
  pageName = "Your Page",
  title,
  shortText,
  destinationUrl,
  cta,
  mediaPreview,
  mediaType,
}: PostPreviewProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg shadow-black/5">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">
            {pageName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{pageName}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Just now</span>
            <span>·</span>
            <Globe className="h-3 w-3" />
          </div>
        </div>
      </div>

      {/* Text Content */}
      {(shortText || title) && (
        <div className="px-4 pb-3">
          {title && <p className="text-sm font-medium text-foreground mb-1">{title}</p>}
          {shortText && <p className="text-sm text-muted-foreground">{shortText}</p>}
        </div>
      )}

      {/* Media */}
      <div className="border-t border-b border-border bg-black/20">
        {mediaPreview ? (
          mediaType?.startsWith("video") ? (
            <video
              src={mediaPreview}
              className="w-full max-h-[280px] object-contain"
              controls
            />
          ) : (
            <img
              src={mediaPreview}
              alt="Post media"
              className="w-full max-h-[280px] object-contain"
            />
          )
        ) : (
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground/40">Media preview</p>
            </div>
          </div>
        )}
      </div>

      {/* Link Preview */}
      {destinationUrl && (
        <div className="mx-4 mt-3 mb-2 p-3 rounded-lg bg-secondary/50 border border-border">
          <p className="text-xs text-muted-foreground truncate">{destinationUrl}</p>
          {title && <p className="text-sm font-medium text-foreground mt-1">{title}</p>}
          {cta && (
            <div className="mt-2">
              <span className="inline-block text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-md">
                {cta}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 flex items-center justify-around border-t border-border">
        <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ThumbsUp className="h-4 w-4" />
          <span>Like</span>
        </button>
        <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <MessageCircle className="h-4 w-4" />
          <span>Comment</span>
        </button>
        <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
