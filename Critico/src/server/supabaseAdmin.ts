import { createClient } from '@supabase/supabase-js';

// ✅ import.meta.env funktioniert in SolidStart überall!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase URL or Service Key is missing in .env");
}

console.log("🔑 Supabase URL:", supabaseUrl ? "✅ Loaded" : "❌ Missing");
console.log("🔑 Service Key:", supabaseServiceKey ? "✅ Loaded" : "❌ Missing");

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
});
