import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder_key";

if (supabaseUrl === "https://placeholder-url.supabase.co") {
  console.warn("⚠️ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables. Supabase features will fail until .env is configured.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
