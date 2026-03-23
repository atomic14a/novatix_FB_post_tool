"use client";

import { useEffect, useState } from "react";
import { Menu, LogOut, User, Globe, ChevronDown, Link2, PenSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type FacebookPage = {
  id: string;
  page_id: string;
  page_name: string;
  is_default: boolean | null;
};

interface TopbarProps {
  onMenuToggle: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [activePage, setActivePage] = useState<FacebookPage | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("facebook_pages")
          .select("id, page_id, page_name, is_default")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false });

        if (data && data.length > 0) {
          const availablePages = data as FacebookPage[];
          setPages(availablePages);
          const defaultPage = availablePages.find((page) => page.is_default) || availablePages[0];
          setActivePage(defaultPage);
        }
      } catch (error) {
        console.error("Error loading pages:", error);
      }
    }

    void init();
  }, [supabase]);

  const handleSwitchPage = async (page: FacebookPage) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("facebook_pages")
        .update({ is_default: false })
        .eq("user_id", user.id);

      await supabase
        .from("facebook_pages")
        .update({ is_default: true })
        .eq("id", page.id)
        .eq("user_id", user.id);

      setActivePage(page);
      setShowDropdown(false);
      toast.success(`Switched to ${page.page_name}`);
    } catch {
      toast.error("Failed to switch page");
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
      return;
    }
    toast.success("Signed out successfully");
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {pages.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm transition-colors hover:bg-secondary/80"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-500/20 bg-blue-500/10">
                <Globe className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold leading-tight text-foreground">
                  {activePage?.page_name || "Select Page"}
                </p>
                <p className="text-[10px] leading-tight text-muted-foreground">
                  Default publishing page
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute left-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/30">
                  <div className="border-b border-border p-2">
                    <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Switch Default Page
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1.5">
                    {pages.map((page) => (
                      <button
                        key={page.id}
                        onClick={() => handleSwitchPage(page)}
                        className={`w-full cursor-pointer rounded-lg px-3 py-2.5 text-left transition-colors ${
                          activePage?.id === page.id
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-blue-500/20 bg-blue-500/10">
                            <Globe className="h-4 w-4 text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{page.page_name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">{page.page_id}</p>
                          </div>
                          {activePage?.id === page.id && (
                            <span className="ml-auto text-[10px] font-semibold text-primary">Active</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-border p-2">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        router.push("/dashboard/facebook-pages");
                      }}
                      className="w-full cursor-pointer py-1.5 text-center text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      Manage Pages ?
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => router.push("/dashboard/facebook-pages")}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Connect a Page</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-2 md:inline-flex"
          onClick={() => router.push("/dashboard/meta-links")}
        >
          <Link2 className="h-4 w-4" />
          New Meta Link
        </Button>
        <Button
          size="sm"
          className="hidden gap-2 md:inline-flex"
          onClick={() => router.push("/dashboard/create-post")}
        >
          <PenSquare className="h-4 w-4" />
          Publish Post
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Profile">
          <User className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
