import { createClient } from "@supabase/supabase-js";

// Ambil URL dan KEY dari Environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Pengecekan Keamanan (Supaya Build Vercel tidak error merah)
if (!supabaseUrl || !supabaseKey) {
  // Saat build time di server, environment variable mungkin belum tersedia
  // Kita biarkan lewat dulu, tapi kasih peringatan di console
  console.warn(
    "⚠️ Supabase URL atau Key belum disetting di Environment Variables!",
  );
}

// Export client
// Kita gunakan '!' (non-null assertion) atau string kosong sebagai fallback sementara
// agar TypeScript tidak marah saat build.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder-key",
);
