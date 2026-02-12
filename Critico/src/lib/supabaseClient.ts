import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
  // ✅ REALTIME CONFIG
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

console.log("✅ Supabase client initialized with JWT persistence");
console.log("📡 Supabase Realtime enabled:", !!supabase.realtime);
console.log("🔗 Supabase URL:", supabaseUrl);
