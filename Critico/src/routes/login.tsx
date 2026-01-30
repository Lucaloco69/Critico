/**
 * Login (Page)
 * ------------
 * Login-Seite für Critico mit E-Mail/Passwort Auth über Supabase und anschließender Weiterleitung.
 *
 * - Redirectet bereits eingeloggte Nutzer automatisch auf redirectTo (falls gesetzt) oder /home.
 * - Verwaltet Formular-State für E-Mail, Passwort sowie UI-Feedback (loading, error).
 * - handleLogin führt den Supabase Password-Login via supabase.auth.signInWithPassword() aus und
 *   behandelt Fehler so, dass keine detaillierten Hinweise (User existiert vs. Passwort falsch)
 *   nach außen geleakt werden.
 * - Bei Erfolg wird die erhaltene Session + User im sessionStore gespeichert (setSession) und der
 *   Nutzer per navigate() weitergeleitet.
 * - Rendert ein Tailwind-gestyltes Formular inkl. Validierung (required), Ladezustand-Button und Link
 *   zur Registrierung (/signup).
 */

import { createSignal, createEffect } from "solid-js";
import { useNavigate, useLocation, A } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import { setSession, isLoggedIn } from "../lib/sessionStore";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // Ziel nach Login: /login?redirectTo=%2Factivate%2F<token>
  // Solid Router stellt Query-Parameter als reactive SearchParams Proxy bereit. [web:837]
  const redirectTo = () => {
    const raw = location.query.redirectTo;
    return (typeof raw === "string" && raw.trim().length > 0) ? raw : "/home";
  };

  // Falls schon eingeloggt: direkt weiter (wichtig für QR-Flow).
  createEffect(() => {
    if (isLoggedIn()) {
      navigate(redirectTo(), { replace: true });
    }
  });

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("🔐 Attempting login for:", email());

      // 1. Supabase Auth Login
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email(),
        password: password(),
      });

      if (signInError) {
        console.error("❌ Auth login failed:", signInError);
        throw new Error("E-Mail oder Passwort falsch");
      }

      console.log("✅ Auth login successful");

      // 2. Speichere Session
      setSession({
        session: data.session,
        user: data.user,
      });

      console.log("✅ Login complete!");

      // 3. Weiterleitung: zurück zur angeforderten Seite (z.B. /activate/<token>) oder /home
      navigate(redirectTo(), { replace: true });

    } catch (err: any) {
      console.error("💥 Login error:", err);
      setError(err.message || "Login fehlgeschlagen");
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
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Willkommen zurück
          </h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Melde dich in deinem Critico Konto an
          </p>
        </div>

        <form class="space-y-5" onSubmit={handleLogin}>
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
            />
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
                Wird angemeldet...
              </span>
            ) : (
              "Anmelden"
            )}
          </button>
        </form>

        <p class="text-sm text-center text-gray-600 dark:text-gray-400">
          Noch kein Konto?{" "}
          <A href="/signup" class="font-semibold text-sky-600 hover:text-sky-500 transition-colors">
            Jetzt registrieren
          </A>
        </p>
      </div>
    </div>
  );
}
