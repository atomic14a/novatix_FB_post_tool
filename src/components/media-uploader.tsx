"use client";

import { useCallback, useState } from "react";
import { Upload, X, Film, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaUploaderProps {
  onFileSelect: (file: File) => void;
  currentPreview?: string | null;
  currentType?: string | null;
  onRemove?: () => void;
  className?: string;
}

export function MediaUploader({
  onFileSelect,
  currentPreview,
  currentType,
  onRemove,
  className,
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.type.startsWith("image/") || file.type.startsWith("video/"))) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  if (currentPreview) {
    return (
      <div className={cn("relative rounded-xl border border-border overflow-hidden bg-secondary/30", className)}>
        {currentType?.startsWith("video") ? (
          <video
            src={currentPreview}
            className="w-full max-h-[300px] object-contain bg-black"
            controls
          />
        ) : (
          <img
            src={currentPreview}
            alt="Preview"
            className="w-full max-h-[300px] object-contain bg-black/50"
          />
        )}
        {onRemove && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-lg"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <div className="p-3 flex items-center gap-2 text-xs text-muted-foreground border-t border-border">
          {currentType?.startsWith("video") ? (
            <Film className="h-3.5 w-3.5" />
          ) : (
            <ImageIcon className="h-3.5 w-3.5" />
          )}
          <span>{currentType?.startsWith("video") ? "Video" : "Image"} uploaded</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200 cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border hover:border-primary/40 hover:bg-secondary/30",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById("media-upload")?.click()}
    >
      <input
        id="media-upload"
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileInput}
      />
      <div className="rounded-2xl bg-secondary/50 p-4 mb-4">
        <Upload className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">
        Drag & drop media here
      </p>
      <p className="text-xs text-muted-foreground">
        or click to browse • Images & videos supported
      </p>
    </div>
  );
}
