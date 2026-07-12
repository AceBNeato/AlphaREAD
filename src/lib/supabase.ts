import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase client using the keys provided
const supabaseUrl = "https://fefbwnmotovihugcjskn.supabase.co";
const supabaseAnonKey = "sb_publishable_cU61mKlrOoRsh4kd7xGhgA_DAhUI1tN";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
