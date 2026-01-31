import { Show, createEffect, createSignal } from "solid-js";
import QRCode from "qrcode";
import { supabase } from "../../lib/supabaseClient";
import sessionStore from "../../lib/sessionStore";

type Props = {
  productId: number;
  testerUserId: number;   // senderId aus der ursprünglichen request
  ownerUserId: number;    // productOwnerId
};

export default function RequestQrReadyBubble(props: Props) {
  const [token, setToken] = createSignal<string | null>(null);
  const [qrUrl, setQrUrl] = createSignal<string | null>(null);
  const [err, setErr] = createSignal<string | null>(null);

  const isOwner = () => sessionStore.userId != null && sessionStore.userId === props.ownerUserId;

  createEffect(async () => {
    setErr(null);

    if (!isOwner()) return;

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
      setErr("Kein Token gefunden.");
      return;
    }

    setToken(data.token);

    const redeemUrl = `${window.location.origin}/redeem/${data.token}`;
    const url = await QRCode.toDataURL(redeemUrl);
    setQrUrl(url);
  });

  const copyLink = async () => {
    if (!token()) return;
    const redeemUrl = `${window.location.origin}/redeem/${token()}`;
    await navigator.clipboard.writeText(redeemUrl);
  };

  const printQr = () => window.print();

  return (
    <div class="p-4 rounded-2xl border bg-white dark:bg-gray-800">
      <Show when={isOwner()} fallback={<p class="text-sm text-gray-600 dark:text-gray-300">📦 QR-Code wurde erstellt (liegt beim Verkäufer).</p>}>
        <p class="font-semibold mb-2">📦 QR-Code für Tester</p>

        <Show when={!err()} fallback={<p class="text-sm text-red-600">{err()}</p>}>
          <Show when={qrUrl()} fallback={<p class="text-sm text-gray-500">QR wird geladen…</p>}>
            <img src={qrUrl()!} alt="QR Code" class="w-48 h-48" />
            <div class="flex gap-2 mt-3">
              <button class="px-3 py-2 rounded-lg bg-sky-500 text-white" onClick={copyLink}>
                Link kopieren
              </button>
              <button class="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700" onClick={printQr}>
                Drucken
              </button>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
