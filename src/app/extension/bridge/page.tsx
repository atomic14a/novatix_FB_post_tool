"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

export default function ExtensionBridgePage() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState("Connecting your website session...");

  useEffect(() => {
    async function bridge() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const redirectTo = hash.get("redirect") || "/dashboard/extension";

      if (!accessToken || !refreshToken) {
        setStatus("Missing extension session data.");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setStatus(error.message);
        return;
      }

      window.history.replaceState({}, document.title, "/extension/bridge");
      setStatus("Website connected. Redirecting to Extension Hub...");
      router.replace(redirectTo);
      router.refresh();
    }

    void bridge();
  }, [router, supabase]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Extension Bridge
          </CardTitle>
          <CardDescription>Securely linking your extension login with the website session.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {status}
        </CardContent>
      </Card>
    </div>
  );
}
