import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, description, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "group overflow-hidden rounded-2xl border border-border/80 bg-card/92 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_22px_60px_rgba(67,97,238,0.16)]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="rounded-2xl bg-gradient-to-br from-primary/18 to-secondary/55 p-3 shadow-inner shadow-white/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted/70">
        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-primary via-blue-400 to-secondary" />
      </div>
    </div>
  );
}
