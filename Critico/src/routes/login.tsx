import { createSignal, createEffect } from "solid-js";
import { useNavigate, A, useLocation } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import { setSession, isLoggedIn } from "../lib/sessionStore";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  const getRedirectTarget = () => {
    const qs = new URLSearchParams(location.search);
    const encoded = qs.get("redirectTo");
    if (!encoded) return "/home";

    try {
      const decoded = decodeURIComponent(encoded);
      // Sicherheitscheck: nur interne Pfade erlauben
      if (decoded.startsWith("/")) return decoded;
      return "/home";
    } catch {
      return "/home";
    }
  };

  createEffect(() => {
    if (isLoggedIn()) {
      navigate(getRedirectTarget(), { replace: true });
    }
  });

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email(),
        password: password(),
      });

      if (signInError) throw new Error("E-Mail oder Passwort falsch");

      setSession({
        session: data.session,
        user: data.user,
      });

      navigate(getRedirectTarget(), { replace: true });
    } catch (err: any) {
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
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Willkommen zurück</h1>
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
              <p class="text-sm text-red-700 dark:text-red-300">{error()}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading()}
            class="w-full py-3 px-4 bg-linear-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold disabled:cursor-not-allowed"
          >
            {loading() ? "Wird angemeldet..." : "Anmelden"}
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
