"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { User, Facebook, LogOut, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [pages, setPages] = useState<any[]>([]);
  const [defaultPageId, setDefaultPageId] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setEmail(user.email || "");

        const { data: pagesData } = await supabase
          .from("facebook_pages")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        setPages(pagesData || []);
        const defaultPage = pagesData?.find((p: any) => p.is_default);
        if (defaultPage) setDefaultPageId(defaultPage.id);
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [supabase]);

  const handleSaveDefault = async () => {
    if (!defaultPageId) return;
    setSaving(true);

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
        .update({ is_default: true })
        .eq("id", defaultPageId)
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Settings updated!");
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
      />

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} disabled className="opacity-70" />
            <p className="text-xs text-muted-foreground">
              Your email is managed through Supabase Auth
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Default Facebook Page */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Facebook className="h-4 w-4 text-primary" />
            Facebook Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Facebook Page</Label>
            <Select
              value={defaultPageId}
              onChange={(e) => setDefaultPageId(e.target.value)}
            >
              <option value="">Select default page</option>
              {pages.map((page: any) => (
                <option key={page.id} value={page.id}>
                  {page.page_name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSaveDefault}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/facebook-pages")}
              className="gap-2"
            >
              <Facebook className="h-4 w-4" />
              Manage Pages
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="border-destructive/20">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <h3 className="font-semibold text-foreground">Sign Out</h3>
            <p className="text-sm text-muted-foreground">
              Sign out of your Novatix FB Tool account
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2 text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/40 hover:bg-destructive/5"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
