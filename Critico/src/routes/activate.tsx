import { createEffect, createSignal, Show } from "solid-js";
import { useNavigate, useParams, useLocation, A } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import { isLoggedIn } from "../lib/sessionStore";

export default function Activate() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string>("");
  const [productId, setProductId] = createSignal<number | null>(null);

  createEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");

        // Wenn nicht eingeloggt: Login + Rücksprung auf aktuelle URL (inkl. Token)
        // useLocation liefert pathname/search/hash. [web:837]
        if (!isLoggedIn()) {
          const currentUrl = `${location.pathname}${location.search}${location.hash}`;
          const target = encodeURIComponent(currentUrl);
          navigate(`/login?redirectTo=${target}`, { replace: true });
          return;
        }

        const token = params.token;
        if (!token) {
          setError("Kein Token gefunden.");
          return;
        }

        const { data, error } = await supabase.rpc("redeem_comment_token", {
          p_token: token,
        });

        if (error) throw error;

        // RPC returns product_id (int)
        setProductId(Number(data));
      } catch (e: any) {
        setError(e?.message ?? "Aktivierung fehlgeschlagen.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  });

  return (
    <div class="min-h-screen flex items-center justify-center bg-linear-to-br from-sky-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 px-4">
      <div class="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <Show when={loading()}>
          <div class="flex items-center gap-3 text-gray-700 dark:text-gray-200">
            <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            Aktivierung läuft…
          </div>
        </Show>

        <Show when={!loading() && !!error()}>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Aktivierung fehlgeschlagen
          </h1>
          <p class="text-sm text-red-600 dark:text-red-300 mb-6">{error()}</p>
          <A
            href="/home"
            class="inline-block px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-semibold"
          >
            Zur Startseite
          </A>
        </Show>

        <Show when={!loading() && !error() && productId() != null}>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            QR-Code aktiviert
          </h1>
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">
            Du kannst jetzt dieses Produkt bewerten und kommentieren.
          </p>

          <button
            onClick={() => navigate(`/product/${productId()}#comment-section`, { replace: true })}
            class="w-full py-3 px-4 bg-linear-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
          >
            Zum Produkt & kommentieren
          </button>
        </Show>
      </div>
    </div>
  );
}
