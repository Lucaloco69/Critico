import { Show, createEffect, createSignal } from "solid-js";
import QRCode from "qrcode";
import { supabase } from "../../lib/supabaseClient";
import sessionStore from "../../lib/sessionStore";
import { t } from "../../lib/i18n";

type Props = {
  productId: number;
  testerUserId: number; // senderId aus der ursprünglichen request
  ownerUserId: number; // productOwnerId
};

export default function RequestQrReadyBubble(props: Props) {
  const [token, setToken] = createSignal<string | null>(null);
  const [qrUrl, setQrUrl] = createSignal<string | null>(null);
  const [redeemUrl, setRedeemUrl] = createSignal<string | null>(null);
  const [err, setErr] = createSignal<string | null>(null);
  const [copied, setCopied] = createSignal(false);

  const isOwner = () => {
    const userId = sessionStore.user?.id;
    if (userId == null) return false;
    return Number(userId) === Number(props.ownerUserId);
  };

  createEffect(() => {
    setErr(null);

    if (!isOwner()) return;

    (async () => {
      // Token-Row holen (RLS soll sicherstellen: nur Owner darf das)
      const { data, error } = await supabase
        .from("ProductCommentTokens")
        .select("token, redeemed_at")
        .eq("product_id", props.productId)
        .eq("tester_user_id", props.testerUserId)
        .eq("owner_user_id", props.ownerUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setErr(error.message);
        return;
      }
      if (!data?.token) {
        setErr(t("chatRequestQrReadyBubble.noTokenFound"));
        return;
      }

      setToken(data.token);

      const url = `${window.location.origin}/redeem/${data.token}`;
      setRedeemUrl(url);

      try {
        const qr = await QRCode.toDataURL(url, {
          width: 400,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrUrl(qr);
      } catch (qrError) {
        console.error(t("chatRequestQrReadyBubble.qrGeneratingFailedLog"), qrError);
        setErr(t("chatRequestQrReadyBubble.qrCreateFailed"));
      }
    })();
  });

  const copyLink = async () => {
    const url = redeemUrl();
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(t("chatRequestQrReadyBubble.copyFailedLog"), e);
    }
  };

  const printQr = () => {
    window.print();
  };

  return (
    <div class="p-4 rounded-2xl border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
      <Show
        when={isOwner()}
        fallback={
          <div class="flex items-center gap-2">
            <div class="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              📦
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300">{t("chatRequestQrReadyBubble.compactText")}</p>
          </div>
        }
      >
        <div class="flex items-start gap-3 mb-4">
          <div class="w-12 h-12 bg-orange-500 dark:bg-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-gray-900 dark:text-white text-lg mb-1">{t("chatRequestQrReadyBubble.title")}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">{t("chatRequestQrReadyBubble.subtitle")}</p>
          </div>
        </div>

        <Show
          when={!err()}
          fallback={
            <div class="p-4 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <p class="text-sm text-red-600 dark:text-red-400 font-medium">❌ {err()}</p>
            </div>
          }
        >
          <Show
            when={qrUrl()}
            fallback={
              <div class="flex items-center justify-center py-8">
                <div class="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700">
              {/* QR Code */}
              <div class="flex justify-center mb-4">
                <img
                  src={qrUrl()!}
                  alt={t("chatRequestQrReadyBubble.qrAlt")}
                  class="w-64 h-64 border-4 border-gray-100 dark:border-gray-700 rounded-lg shadow-md"
                />
              </div>

              {/* URL Anzeige */}
              <div class="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{t("chatRequestQrReadyBubble.activationLinkLabel")}</p>
                <p class="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">{redeemUrl()}</p>
              </div>

              {/* Beschreibung */}
              <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p class="text-sm text-blue-900 dark:text-blue-200">
                  <strong>{t("chatRequestQrReadyBubble.instructionsLabel")}</strong> {t("chatRequestQrReadyBubble.instructionsText")}
                </p>
              </div>

              {/* Buttons */}
              <div class="flex gap-3">
                <button
                  class="flex-1 px-3 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  onClick={copyLink}
                  type="button"
                >
                  <Show
                    when={!copied()}
                    fallback={
                      <>
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {t("chatRequestQrReadyBubble.copied")}
                      </>
                    }
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    {t("chatRequestQrReadyBubble.copyLink")}
                  </Show>
                </button>

                <button
                  class="flex-1 px-4 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  onClick={printQr}
                  type="button"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  {t("chatRequestQrReadyBubble.print")}
                </button>
              </div>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
