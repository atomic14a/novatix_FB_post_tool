import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Edit, Image, Trash2 } from "lucide-react";

interface PostCardProps {
  id: string;
  title: string;
  shortText?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  pageName?: string;
  status: "draft" | "published";
  date: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function PostCard({
  id,
  title,
  shortText,
  mediaUrl,
  pageName,
  status,
  date,
  onEdit,
  onDelete,
}: PostCardProps) {
  return (
    <div className="group rounded-xl border border-border bg-card p-4 shadow-lg shadow-black/5 transition-all duration-200 hover:shadow-xl hover:shadow-black/10 hover:border-primary/20">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0 h-20 w-20 rounded-lg bg-secondary/50 border border-border overflow-hidden flex items-center justify-center">
          {mediaUrl ? (
            <img
              src={mediaUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <Image className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{title}</h3>
              {shortText && (
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                  {shortText}
                </p>
              )}
            </div>
            <Badge variant={status === "published" ? "success" : "secondary"}>
              {status === "published" ? "Published" : "Draft"}
            </Badge>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {pageName && (
                <span className="truncate max-w-[150px]">{pageName}</span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {date}
              </span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(id)}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
