import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a mock-like proxy that won't crash but won't work either.
    // This allows the UI to render even without Supabase configured.
    return createMockClient();
  }

  client = createBrowserClient(url, key);
  return client;
}

// Minimal mock that prevents crashes when Supabase is not configured
function createMockClient(): any {
  const emptyResponse = { data: { user: null, session: null }, error: null };
  const emptyList = { data: [], error: null, count: 0 };

  const mockQuery: any = {
    select: () => mockQuery,
    insert: () => mockQuery,
    update: () => mockQuery,
    delete: () => mockQuery,
    eq: () => mockQuery,
    order: () => mockQuery,
    limit: () => mockQuery,
    single: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
    then: (resolve: any) => resolve(emptyList),
  };

  return {
    auth: {
      getUser: () => Promise.resolve(emptyResponse),
      getSession: () => Promise.resolve(emptyResponse),
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: "Supabase not configured. Please add your credentials to .env.local" } }),
      signUp: () => Promise.resolve({ data: null, error: { message: "Supabase not configured. Please add your credentials to .env.local" } }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => mockQuery,
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        remove: () => Promise.resolve({ error: null }),
      }),
    },
  };
}
