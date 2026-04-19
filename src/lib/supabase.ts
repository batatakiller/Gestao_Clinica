import { createClient } from '@supabase/supabase-js';

// Fallback para URL válida para evitar erro "supabaseUrl is required" durante o build do Next.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);




