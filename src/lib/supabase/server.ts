import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client with administrative / service-role privileges.
 *
 * ARCHITECTURE NOTE:
 * - Used exclusively for PostgreSQL database access and Supabase Storage.
 * - Supabase Auth session persistence is completely disabled.
 * - All authentication, sessions, and OAuth are handled custom.
 * - This client must NEVER be exposed or executed on the client-side.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseAdmin() must only be called in server environments.");
  }

  if (serverClient) {
    return serverClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Ensure they are configured in your .env.local file."
    );
  }

  serverClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return serverClient;
}
