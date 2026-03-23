"use client";

import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Facebook, Star, Unplug, Plug, Globe, RefreshCw, Loader2, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { refreshFacebookPages, disconnectFacebookAccount } from "@/lib/actions/facebook-sync";

type FacebookDiagnostics = {
  debugReason: string | null;
  grantedPermissions: string[];
  declinedPermissions: string[];
  missingPermissions: string[];
};

type FacebookAccount = {
  facebook_account_id: string;
  facebook_account_name: string;
};

type FacebookPage = {
  id: string;
  page_id: string;
  page_name: string;
  is_default: boolean;
};

const EMPTY_DIAGNOSTICS: FacebookDiagnostics = {
  debugReason: null,
  grantedPermissions: [],
  declinedPermissions: [],
  missingPermissions: [],
};

function FacebookPagesContent() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [account, setAccount] = useState<FacebookAccount | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [diagnostics, setDiagnostics] = useState<FacebookDiagnostics>(EMPTY_DIAGNOSTICS);

  useEffect(() => {
    loadPages();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;

      if (event.data.type === "FB_AUTH_SUCCESS") {
        const nextDiagnostics: FacebookDiagnostics = {
          debugReason: event.data.debugReason || null,
          grantedPermissions: event.data.grantedPermissions || [],
          declinedPermissions: event.data.declinedPermissions || [],
          missingPermissions: event.data.missingPermissions || [],
        };

        setDiagnostics(nextDiagnostics);

        if ((event.data.count || 0) === 0 && nextDiagnostics.debugReason) {
          toast.warning(`Facebook connected, but no Pages were returned. ${nextDiagnostics.debugReason}`);
        } else {
          toast.success(`Facebook connected successfully. Found ${event.data.count || 0} page(s).`);
        }

        loadPages();
      } else if (event.data.type === "FB_AUTH_ERROR") {
        const errorMsg = event.data.error || "Unknown error";
        toast.error(`Connection failed: ${errorMsg}`);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function loadPages() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [accountRes, pagesRes] = await Promise.all([
        supabase.from("facebook_accounts").select("*").eq("user_id", user.id).single(),
        supabase
          .from("facebook_pages")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (accountRes.data) {
        setAccount(accountRes.data);
      } else {
        setAccount(null);
        setDiagnostics(EMPTY_DIAGNOSTICS);
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

    window.open(
      "/api/auth/facebook",
      "Facebook Login",
      `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );
  };

  const handleRefreshPages = async () => {
    setIsRefreshing(true);
    toast.info("Syncing pages with Facebook...");

    try {
      const result = await refreshFacebookPages();

      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        const nextDiagnostics: FacebookDiagnostics = {
          debugReason: "debugReason" in result ? result.debugReason || null : null,
          grantedPermissions: "grantedPermissions" in result ? result.grantedPermissions || [] : [],
          declinedPermissions: "declinedPermissions" in result ? result.declinedPermissions || [] : [],
          missingPermissions: "missingPermissions" in result ? result.missingPermissions || [] : [],
        };

        setDiagnostics(nextDiagnostics);

        if ((result.total || 0) === 0 && nextDiagnostics.debugReason) {
          toast.warning(`Sync finished, but Facebook still returned 0 pages. ${nextDiagnostics.debugReason}`);
        } else {
          toast.success(`Successfully synced! Current pages: ${result.total} (Added ${result.added}, Updated ${result.updated})`);
        }

        loadPages();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to sync pages");
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
        setDiagnostics(EMPTY_DIAGNOSTICS);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect account");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      await supabase.from("facebook_pages").update({ is_default: false }).eq("user_id", user.id);

      const { error } = await supabase
        .from("facebook_pages")
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Default page updated!");
      loadPages();
    } catch {
      toast.error("Failed to update default page");
    }
  };

  const isFacebookConfigured =
    !!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID &&
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID !== "your-facebook-app-id";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="mb-2 h-8 w-48" />
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
        description={
          account
            ? "Manage your connected Facebook account and pages"
            : "Connect your Facebook account to start managing pages"
        }
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
            <strong>Warning: Facebook App not configured.</strong> Add your{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">FACEBOOK_APP_ID</code> and{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">FACEBOOK_APP_SECRET</code> to{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">.env.local</code> to enable real Facebook page
            connection.
          </p>
        </div>
      )}

      {account && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/20 text-blue-500">
                <Facebook className="h-6 w-6" />
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-foreground">
                  {account.facebook_account_name}
                  <Badge variant="success" className="text-[10px] uppercase">
                    Connected
                  </Badge>
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <UserCircle className="h-3.5 w-3.5" /> ID: {account.facebook_account_id}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    &bull; {pages.length} Connected Page{pages.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnectAll}
              disabled={isDisconnecting}
              className="gap-1.5 border-destructive/20 text-destructive hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
            >
              {isDisconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
              Disconnect Account
            </Button>
          </CardContent>
        </Card>
      )}

      {account && pages.length === 0 && diagnostics.debugReason && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="space-y-3 p-5">
            <div>
              <h3 className="font-semibold text-foreground">Facebook Diagnostics</h3>
              <p className="mt-1 text-sm text-muted-foreground">{diagnostics.debugReason}</p>
            </div>

            {diagnostics.missingPermissions.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-300">Missing Permissions</p>
                <p className="mt-1 text-sm text-foreground">{diagnostics.missingPermissions.join(", ")}</p>
              </div>
            )}

            {diagnostics.grantedPermissions.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">Granted Permissions</p>
                <p className="mt-1 text-sm text-foreground">{diagnostics.grantedPermissions.join(", ")}</p>
              </div>
            )}

            {diagnostics.declinedPermissions.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-300">Declined / Not Granted</p>
                <p className="mt-1 text-sm text-foreground">{diagnostics.declinedPermissions.join(", ")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {account && pages.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No pages found"
          description="We couldn't find any Facebook Pages connected to your account. Reconnect, complete every Meta permission screen, then use Refresh Pages again."
          actionLabel="Reconnect Account"
          onAction={handleConnect}
        />
      ) : account && pages.length > 0 ? (
        <div className="space-y-4">
          <h4 className="px-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">Your Pages</h4>
          <div className="space-y-3">
            {pages.map((page) => (
              <Card key={page.id} className="transition-all duration-200 hover:border-border/80">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-foreground">{page.page_name}</h3>
                        {page.is_default && (
                          <Badge variant="default" className="text-[10px]">
                            <Star className="mr-1 h-2 w-2" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">ID: {page.page_id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!page.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(page.id)}
                        className="h-8 gap-1.5 text-xs"
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
      ) : !account ? (
        <EmptyState
          icon={Facebook}
          title="Connect your account"
          description="Click the button above to securely connect your Facebook account and start managing your Facebook Pages directly from this dashboard."
          actionLabel="Connect Facebook"
          onAction={handleConnect}
        />
      ) : null}
    </div>
  );
}

export default function FacebookPagesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="mb-2 h-8 w-48" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <FacebookPagesContent />
    </Suspense>
  );
}
