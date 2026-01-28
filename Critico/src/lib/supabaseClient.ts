/**
 * supabaseClient
 * --------------
 * Initialisiert den Supabase JavaScript Client für die App.
 *
 * - Liest Supabase URL und den öffentlichen (Anon/PUBLISHABLE) API-Key aus den Vite-Environment-Variablen.
 * - Exportiert eine konfigurierte supabase-Instanz, die in der gesamten App für Auth, DB-Queries
 *   und Realtime genutzt wird.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
