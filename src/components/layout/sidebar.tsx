"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Facebook,
  PenSquare,
  FileText,
  Send,
  Settings,
  Link2,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/facebook-pages", label: "Pages", icon: Facebook },
  { href: "/dashboard/meta-links", label: "Meta Links", icon: Link2 },
  { href: "/dashboard/create-post", label: "Publish", icon: PenSquare },
  { href: "/dashboard/drafts", label: "Drafts", icon: FileText },
  { href: "/dashboard/published", label: "Published", icon: Send },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">
                Novatix FB Tool
              </h1>
              <p className="text-[10px] leading-tight text-muted-foreground">
                Pages, links, and publishing
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-b border-sidebar-border px-4 py-4">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Best Flow
            </p>
            <p className="mt-1 text-xs font-medium text-sidebar-foreground">
              Create a Meta Link, then publish it to Facebook.
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("h-4.5 w-4.5", isActive && "text-sidebar-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <p className="text-center text-[10px] text-muted-foreground/60">
            (c) 2026 Novatix Solution
          </p>
        </div>
      </aside>
    </>
  );
}
