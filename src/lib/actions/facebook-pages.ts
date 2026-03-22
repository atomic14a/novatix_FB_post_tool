"use server";

import { createClient } from "@/lib/supabase/server";

export type FacebookPage = {
  id: string;
  user_id: string;
  page_name: string;
  page_id: string;
  page_access_token: string | null;
  is_default: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function getPages() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("facebook_pages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pages:", error);
    return [];
  }
  return data || [];
}

export async function addPage(pageName: string, pageId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("facebook_pages")
    .insert({
      user_id: user.id,
      page_name: pageName,
      page_id: pageId,
      is_default: false,
      status: "connected",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setDefaultPage(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Remove default from all pages
  await supabase
    .from("facebook_pages")
    .update({ is_default: false })
    .eq("user_id", user.id);

  // Set new default
  const { data, error } = await supabase
    .from("facebook_pages")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removePage(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("facebook_pages")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
}
