/**
 * KokiKasir — Supabase Client
 *
 * ⚠️  SETUP REQUIRED:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Copy your Project URL and anon public key.
 * 3. Create a `.env.local` file in the project root with:
 *
 *      VITE_SUPABASE_URL=https://your-project-id.supabase.co
 *      VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
 *
 * 4. Install the Supabase client:
 *      pnpm add @supabase/supabase-js
 *
 * 5. Run SQL in your Supabase SQL editor to create required tables:
 *    See: src/lib/supabase-schema.sql
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

let supabase = null;

/**
 * Returns true if Supabase is configured and available.
 */
export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Lazily initialises and returns the Supabase client.
 * Returns null if credentials are not configured.
 */
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (supabase) return supabase;

  // Dynamic import — only loads the supabase-js bundle when credentials are set.
  // This prevents a build error when the package is not yet installed.
  try {
    // If @supabase/supabase-js is installed, replace this block:
    // const { createClient } = await import('@supabase/supabase-js');
    // supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    //   auth: {
    //     persistSession: true,
    //     storage: localStorage,
    //     autoRefreshToken: true,
    //   }
    // });
    console.warn('[KokiKasir] Supabase: Run `pnpm add @supabase/supabase-js` and uncomment getSupabaseClient().');
    return null;
  } catch {
    return null;
  }
}

export { supabase };
