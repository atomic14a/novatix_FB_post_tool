import { EXTENSION_VERSION, EXTENSION_ROUTES } from "@/lib/extension/constants";

export async function GET() {
  return Response.json({
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    extensionVersion: EXTENSION_VERSION,
    routes: EXTENSION_ROUTES,
  });
}
