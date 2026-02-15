import { createSignal, onMount, Show } from "solid-js";
import { useNavigate, A, useLocation } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import { setSession, isLoggedIn } from "../lib/sessionStore";
import { t } from "../lib/i18n";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  
  const [savedRedirectTo, setSavedRedirectTo] = createSignal<string>("/home");
  const [mounted, setMounted] = createSignal(false); // ✅ NEU!

  // ✅ 1. onMount: Parse redirectTo
  onMount(() => {
    const qs = new URLSearchParams(location.search);
    const encoded = qs.get("redirectTo");

    console.log("🎬 LOGIN MOUNT: Raw redirectTo:", encoded);

    if (encoded) {
      try {
        const decoded = decodeURIComponent(encoded);
        if (decoded.startsWith("/")) {
          console.log("✅ LOGIN MOUNT: Saved redirectTo:", decoded);
          setSavedRedirectTo(decoded);
          
          if (!decoded.includes("/activate/")) {
            console.log("🗑️ LOGIN MOUNT: Clearing pendingActivateToken (not from activate route)");
            localStorage.removeItem("pendingActivateToken");
          }
        }
      } catch (err) {
        console.error("❌ LOGIN MOUNT: Error decoding redirectTo:", err);
      }
    } else {
      console.log("🗑️ LOGIN MOUNT: No redirectTo, clearing pendingActivateToken");
      localStorage.removeItem("pendingActivateToken");
    }

    // ✅ 2. Dann check ob schon eingeloggt
    setMounted(true);
    
    if (isLoggedIn()) {
      const target = savedRedirectTo();
      const pendingToken = localStorage.getItem("pendingActivateToken");
      
      console.log("🔐 LOGIN MOUNT: Already logged in!");
      console.log("🎯 LOGIN MOUNT: Target:", target);
      console.log("🎫 LOGIN MOUNT: Pending token:", pendingToken ? "YES" : "NO");
      
      if (pendingToken && target.includes("/activate/")) {
        console.log("🎫 LOGIN MOUNT: Redirecting to activate with token");
        navigate(target, { replace: true });
      } else {
        if (pendingToken) {
          console.log("🗑️ LOGIN MOUNT: Clearing irrelevant pendingActivateToken");
          localStorage.removeItem("pendingActivateToken");
        }
        console.log("🚀 LOGIN MOUNT: Redirecting to:", target);
        navigate(target, { replace: true });
      }
    }
  });

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log("═══════════════════════════════════════");
    console.log("🔐 LOGIN: Starting login process...");
    console.log("📧 LOGIN: Email:", email());
    console.log("🎯 LOGIN: Target after login:", savedRedirectTo());

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email(),
        password: password(),
      });

      if (signInError) {
        console.error("❌ LOGIN: Supabase error:", signInError);
        throw new Error(t("login.wrongCreds"));
      }

      console.log("✅ LOGIN: Supabase login successful");
      console.log("👤 LOGIN: User:", data.user.email);

      console.log("💾 LOGIN: Updating session store...");
      setSession({
        session: data.session,
        user: data.user,
      });

      // ✅ Nach erfolgreichem Login: Redirect
      const target = savedRedirectTo();
      const pendingToken = localStorage.getItem("pendingActivateToken");
      
      console.log("🎯 LOGIN: Redirecting to:", target);
      console.log("🎫 LOGIN: Pending token:", pendingToken ? "YES" : "NO");
      
      if (pendingToken && target.includes("/activate/")) {
        console.log("🎫 LOGIN: Redirecting to activate with token");
        navigate(target, { replace: true });
      } else {
        if (pendingToken) {
          console.log("🗑️ LOGIN: Clearing irrelevant pendingActivateToken");
          localStorage.removeItem("pendingActivateToken");
        }
        console.log("🚀 LOGIN: Redirecting to:", target);
        navigate(target, { replace: true });
      }

      console.log("═══════════════════════════════════════");
    } catch (err: any) {
      console.error("❌ LOGIN: Login failed:", err);
      setError(err?.message || t("login.failed"));
    } finally {
      setLoading(false);
    }
  };

  // ✅ Nur UI rendern wenn mounted
  return (
    <Show when={mounted()} fallback={
      <div class="flex items-center justify-center min-h-[90vh]">
        <div class="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <div class="flex items-center justify-center min-h-[90vh] bg-gradient-to-br from-sky-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div class="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
            </div>

            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{t("login.title")}</h1>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("login.subtitle")}</p>
          </div>

          <form class="space-y-5" onSubmit={handleLogin}>
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("login.email")}
              </label>
              <input
                id="email"
                type="email"
                class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                placeholder={t("login.emailPlaceholder")}
                required
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("login.password")}
              </label>
              <input
                id="password"
                type="password"
                class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                placeholder={t("login.passwordPlaceholder")}
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
              class="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold disabled:cursor-not-allowed"
            >
              {loading() ? t("login.submitting") : t("login.submit")}
            </button>
          </form>

          <p class="text-sm text-center text-gray-600 dark:text-gray-400">
            {t("login.noAccount")}{" "}
            <A href="/signup" class="font-semibold text-sky-600 hover:text-sky-500 transition-colors">
              {t("login.signup")}
            </A>
          </p>
        </div>
      </div>
    </Show>
  );
}
