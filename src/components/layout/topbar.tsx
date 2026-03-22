"use client";

import { useEffect, useState } from "react";
import { Menu, LogOut, User, Globe, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface TopbarProps {
  onMenuToggle: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [pages, setPages] = useState<any[]>([]);
  const [activePage, setActivePage] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("facebook_pages")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });

      if (data && data.length > 0) {
        setPages(data);
        const defaultPage = data.find((p: any) => p.is_default) || data[0];
        setActivePage(defaultPage);
      }
    } catch (error) {
      console.error("Error loading pages:", error);
    }
  }

  const handleSwitchPage = async (page: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Remove default from all
      await supabase
        .from("facebook_pages")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // Set new default
      await supabase
        .from("facebook_pages")
        .update({ is_default: true })
        .eq("id", page.id)
        .eq("user_id", user.id);

      setActivePage(page);
      setShowDropdown(false);
      toast.success(`Switched to ${page.page_name}`);
    } catch (error) {
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Active Page Switcher */}
        {pages.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/20">
                <Globe className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {activePage?.page_name || "Select Page"}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {pages.length} page{pages.length !== 1 ? "s" : ""} connected
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute top-full left-0 mt-1.5 z-50 w-64 rounded-xl border border-border bg-card shadow-2xl shadow-black/30 overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">
                      Switch Page ({pages.length})
                    </p>
                  </div>
                  <div className="p-1.5 max-h-64 overflow-y-auto">
                    {pages.map((page: any) => (
                      <button
                        key={page.id}
                        onClick={() => handleSwitchPage(page)}
                        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer ${
                          activePage?.id === page.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary/50 text-foreground"
                        }`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
                          <Globe className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {page.page_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {page.page_id}
                          </p>
                        </div>
                        {activePage?.id === page.id && (
                          <span className="ml-auto text-[10px] font-semibold text-primary">
                            Active
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-border">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        router.push("/dashboard/facebook-pages");
                      }}
                      className="w-full text-center text-xs text-muted-foreground hover:text-primary py-1.5 transition-colors cursor-pointer"
                    >
                      Manage Pages →
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
            className="gap-1.5 text-muted-foreground text-xs"
            onClick={() => router.push("/dashboard/facebook-pages")}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Connect a Page</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          title="Profile"
        >
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
