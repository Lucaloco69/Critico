import { createEffect, createSignal, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import { isLoggedIn } from "../lib/sessionStore";
import { t } from "../lib/i18n";

export default function Activate() {
  const params = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string>("");
  const [productId, setProductId] = createSignal<number | null>(null);
  const [success, setSuccess] = createSignal(false);

  createEffect(() => {
    const token = params.token;

    const run = async () => {
      try {
        setLoading(true);
        setError("");

        // Prüfe ob Token existiert
        if (!token) {
          setError(t("activate.noToken"));
          setLoading(false);
          return;
        }

        // Prüfe ob User eingeloggt ist
        if (!isLoggedIn()) {
          // Speichere Token für nach dem Login
          localStorage.setItem("pendingActivateToken", token);
          // WICHTIG: replace: true, damit diese Seite nicht im Verlauf bleibt
          navigate("/login", { replace: true });
          return;
        }

        // Token einlösen
        const { data, error: rpcError } = await supabase.rpc("redeem_comment_token", {
          p_token: token,
        });

        if (rpcError) throw rpcError;

        const prodId = Number(data);
        setProductId(prodId);
        setSuccess(true);

        // Entferne den gespeicherten Token
        localStorage.removeItem("pendingActivateToken");

        // Automatische Weiterleitung nach 2 Sekunden zur Produktseite
        setTimeout(() => {
          navigate(`/product/${prodId}`, { replace: true });
        }, 2000);

      } catch (e: any) {
        setError(e?.message ?? t("activate.failedTitle"));
        localStorage.removeItem("pendingActivateToken");
      } finally {
        setLoading(false);
      }
    };

    void run();
  });

  const handleGoToProduct = () => {
    if (productId()) {
      navigate(`/product/${productId()}`, { replace: true });
    }
  };

  const handleGoHome = () => {
    navigate("/home", { replace: true });
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 px-4">
      <div class="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        <Show when={loading()}>
          <div class="flex flex-col items-center gap-4">
            <div class="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {t("activate.activatingTitle")}
            </h2>
            <p class="text-gray-600 dark:text-gray-300 text-center">
              {t("activate.activatingText")}
            </p>
          </div>
        </Show>

        <Show when={!loading() && !!error()}>
          <div class="flex flex-col items-center gap-4">
            <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {t("activate.failedTitle")}
            </h1>
            <p class="text-sm text-red-600 dark:text-red-400 text-center mb-4">
              {error()}
            </p>
            <button
              onClick={handleGoHome}
              class="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-semibold transition-colors shadow-lg"
            >
              {t("activate.goToHome")}
            </button>
          </div>
        </Show>

        <Show when={!loading() && !error() && success()}>
          <div class="flex flex-col items-center gap-4">
            <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {t("activate.successTitle")}
            </h1>
            <p class="text-gray-600 dark:text-gray-300 text-center">
              {t("activate.successText")}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {t("activate.redirectingText")}
            </p>

            <button
              onClick={handleGoToProduct}
              class="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
            >
              {t("activate.goToProduct")}
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
}
