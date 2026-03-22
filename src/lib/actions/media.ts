"use server";

import { createClient } from "@/lib/supabase/server";

export async function uploadMedia(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const fileExtension = file.name.split(".").pop();
  const fileName = `${user.id}/${Date.now()}.${fileExtension}`;

  const { data, error } = await supabase.storage
    .from("post-media")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from("post-media")
    .getPublicUrl(data.path);

  return {
    url: publicUrl,
    type: file.type,
  };
}

export async function deleteMedia(path: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.storage
    .from("post-media")
    .remove([path]);

  if (error) throw error;
}
