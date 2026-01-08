import { createSignal, createEffect, For } from "solid-js";
import { useNavigate, A } from "@solidjs/router";
import { createClient } from "@supabase/supabase-js";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";
import { createUser} from "../server/auth";

interface Division {
  Division_ID: number;
  name: string;
}

// Client-Supabase mit publishable Key (VITE_ Prefix!)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("❌ Supabase Config fehlt! Prüfe .env");
}

export const supabaseClient = createClient(supabaseUrl, supabasePublishableKey);

export default function Signup() {
  const navigate = useNavigate();

  createEffect(() => {
    if (isLoggedIn()) {
      navigate("/dashboard", { replace: true });
    }
  });

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [firstName, setFirstName] = createSignal("");
  const [lastName, setLastName] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [message, setMessage] = createSignal("");
  const [error, setError] = createSignal("");

  const handleSignup = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      console.log("🔐 Starting signup for:", email());
     

      // 2. Erstelle User (Server-Side mit Service Key)
      const profileResult = await createUser(
        email(),
        password(),
        firstName(),
        lastName()  // ✅ Jetzt auch Namen übergeben!
      );

      console.log("📊 Signup result:", profileResult);

      if (!profileResult.success) {
        console.error("❌ User creation failed:", profileResult.error);
        throw new Error(`Registrierung fehlgeschlagen: ${profileResult.error}`);
      }

      console.log("✅ Signup successful!");
      setMessage(`Registrierung erfolgreich! Willkommen ${firstName()} ${lastName()}!`);
      
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);

    } catch (err: any) {
      console.error("💥 Signup error:", err);
      setError(err.message || "Ein unbekannter Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex items-center justify-center min-h-[90vh] bg-linear-to-br from-sky-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div class="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-linear-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Neues Konto erstellen
          </h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Erstelle dein Critico Konto
          </p>
        </div>

        <form class="space-y-5" onSubmit={handleSignup}>
          <div>
            <label for="firstName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vorname
            </label>
            <input
              id="firstName"
              type="text"
              class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              value={firstName()}
              onInput={(e) => setFirstName(e.currentTarget.value)}
              placeholder="Max"
              required
            />
          </div>

          <div>
            <label for="lastName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nachname
            </label>
            <input
              id="lastName"
              type="text"
              class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              value={lastName()}
              onInput={(e) => setLastName(e.currentTarget.value)}
              placeholder="Mustermann"
              required
            />
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              placeholder="max@example.com"
              required
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              placeholder="••••••••"
              required
              minlength="6"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Mindestens 6 Zeichen
            </p>
          </div>

          {error() && (
            <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p class="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error()}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading()}
            class="w-full py-3 px-4 bg-linear-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold disabled:cursor-not-allowed hover:scale-[1.02] disabled:hover:scale-100"
          >
            {loading() ? (
              <span class="flex items-center justify-center gap-2">
                <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Wird erstellt...
              </span>
            ) : (
              'Konto erstellen'
            )}
          </button>
        </form>

        <p class="text-sm text-center text-gray-600 dark:text-gray-400">
          Schon ein Konto?{' '}
          <A href="/login" class="font-semibold text-sky-600 hover:text-sky-500 transition-colors">
            Jetzt anmelden
          </A>
        </p>
      </div>
    </div>
  );
}
