import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.warn("⚠️ Supabase URL is missing or using placeholder. Check Coolify Env Vars.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);



