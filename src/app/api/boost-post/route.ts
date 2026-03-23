import { NextResponse } from "next/server";
import { createBoostPost } from "@/lib/actions/posts";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await createBoostPost({
      facebook_page_id: body.facebook_page_id || undefined,
      title: body.title || "",
      short_text: body.short_text || undefined,
      card_description: body.card_description || undefined,
      destination_url: body.destination_url || undefined,
      cta: body.cta || undefined,
      media_url: body.media_url || undefined,
      media_type: body.media_type || undefined,
      is_fake_video: body.is_fake_video || false,
      fake_video_duration: body.fake_video_duration || undefined,
      status: body.status || "published",
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Boost Post failed." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, post: result.post });
  } catch (error) {
    console.error("Boost Post API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Boost Post API failed.",
      },
      { status: 500 }
    );
  }
}
