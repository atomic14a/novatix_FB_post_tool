"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Facebook, Star, Unplug, Plug, Globe, RefreshCw, Loader2, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { Suspense } from "react";
import { refreshFacebookPages, disconnectFacebookAccount } from "@/lib/actions/facebook-sync";

function FacebookPagesContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);

  useEffect(() => {
    loadPages();
  }, []);

  useEffect(() => {
    // Listen for messages from the OAuth popup
    const handleMessage = (event: MessageEvent) => {
      // Ensure the message format matches what we expect
      if (event.data && typeof event.data === 'object') {
        if (event.data.type === 'FB_AUTH_SUCCESS') {
          toast.success(`Facebook connected successfully. Found ${event.data.count || 0} page(s).`);
          loadPages();
        } else if (event.data.type === 'FB_AUTH_ERROR') {
          const errorMsg = event.data.error || "Unknown error";
          toast.error(`Connection failed: ${errorMsg}`);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function loadPages() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Make API calls in parallel
      const [accountRes, pagesRes] = await Promise.all([
        supabase
          .from("facebook_accounts")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("facebook_pages")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
      ]);

      if (accountRes.data) {
        setAccount(accountRes.data);
      } else {
        setAccount(null);
      }

      setPages(pagesRes.data || []);
    } catch (error) {
      console.error("Error loading account/pages:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleConnect = () => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    // Open OAuth process in a popup window
    const newWindow = window.open(
      "/api/auth/facebook", 
      "Facebook Login", 
      `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );
    setAuthWindow(newWindow);
  };

  const handleRefreshPages = async () => {
    setIsRefreshing(true);
    toast.info("Syncing pages with Facebook...");
    
    try {
      const result = await refreshFacebookPages();
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(`Successfully synced! Current pages: ${result.total} (Added ${result.added}, Updated ${result.updated})`);
        loadPages();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync pages");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnectAll = async () => {
    setIsDisconnecting(true);
    try {
      const result = await disconnectFacebookAccount();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Facebook account disconnected completely.");
        setAccount(null);
        setPages([]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect account");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Remove default from all
      await supabase
        .from("facebook_pages")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // Set new default
      const { error } = await supabase
        .from("facebook_pages")
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Default page updated!");
      loadPages();
    } catch (error) {
      toast.error("Failed to update default page");
    }
  };

  const isFacebookConfigured = !!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID && 
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID !== "your-facebook-app-id";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <div className="space-y-4">
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
        title="Facebook Integration"
        description={account ? "Manage your connected Facebook account and pages" : "Connect your Facebook account to start managing pages"}
      >
        {!account ? (
          <Button onClick={handleConnect} className="gap-2">
            <Plug className="h-4 w-4" />
            Connect Facebook
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
               variant="outline" 
               onClick={handleRefreshPages} 
               disabled={isRefreshing}
               className="gap-2"
            >
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh Pages
            </Button>
            <Button onClick={handleConnect} className="gap-2" variant="default">
               <Plug className="h-4 w-4" />
               Reconnect
            </Button>
          </div>
        )}
      </PageHeader>

      {!isFacebookConfigured && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-400">
            <strong>⚠ Facebook App not configured.</strong> Add your <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">FACEBOOK_APP_ID</code> and <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">FACEBOOK_APP_SECRET</code> to <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">.env.local</code> to enable real Facebook page connection.
          </p>
        </div>
      )}

      {/* Account Info Card */}
      {account && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
               <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-500 border border-blue-500/30">
                 <Facebook className="h-6 w-6" />
               </div>
               <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    {account.facebook_account_name}
                    <Badge variant="success" className="text-[10px] uppercase">Connected</Badge>
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <UserCircle className="h-3.5 w-3.5" /> ID: {account.facebook_account_id}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      &bull; {pages.length} Connected Page{pages.length !== 1 ? 's' : ''}
                    </span>
                  </div>
               </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnectAll}
              disabled={isDisconnecting}
              className="gap-1.5 text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/40 hover:bg-destructive/5"
            >
              {isDisconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
              Disconnect Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pages List */}
      {account && pages.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No pages found"
          description="We couldn't find any Facebook Pages connected to your account. You can create a page on Facebook, or click Reconnect to ensure you've given the proper permissions."
          actionLabel="Reconnect Account"
          onAction={handleConnect}
        />
      ) : account && pages.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">Your Pages</h4>
          <div className="space-y-3">
            {pages.map((page) => (
              <Card key={page.id} className="transition-all duration-200 hover:border-border/80">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary border border-border">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground">
                          {page.page_name}
                        </h3>
                        {page.is_default && (
                          <Badge variant="default" className="text-[10px]">
                            <Star className="h-2 w-2 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground font-mono">
                          ID: {page.page_id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!page.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(page.id)}
                        className="gap-1.5 h-8 text-xs"
                      >
                        <Star className="h-3.5 w-3.5" />
                        Set Default
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : !account && (
         <EmptyState
          icon={Facebook}
          title="Connect your account"
          description="Click the button above to securely connect your Facebook account and start managing your Facebook Pages directly from this dashboard."
          actionLabel="Connect Facebook"
          onAction={handleConnect}
        />
      )}
    </div>
  );
}

export default function FacebookPagesPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
             <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    }>
      <FacebookPagesContent />
    </Suspense>
  );
}
