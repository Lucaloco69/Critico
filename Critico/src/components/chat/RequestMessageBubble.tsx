// src/components/chat/RequestMessageBubble.tsx
import { Show, createSignal, createEffect, createMemo } from "solid-js";
import QRCode from "qrcode";
import { supabase } from "../../lib/supabaseClient";

interface RequestMessage {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  receiver_id: number;
  message_type: "request" | "request_qr_ready" | "request_accepted" | "request_declined";
  product_id?: number;
  qr_data_url?: string | null;

  sender: {
    id: number;
    name: string;
    surname: string;
    picture: string | null;
    trustlevel?: number | null;
  } | null;
}

interface RequestMessageBubbleProps {
  message: RequestMessage;
  isOwn: boolean;
  isOwner: boolean;
  formatTime: (dateString: string) => string;
  onAccept?: (messageId: number, senderId: number, productId: number) => Promise<void>;
  onDecline?: (messageId: number) => Promise<void>;
}

export function RequestMessageBubble(props: RequestMessageBubbleProps) {
  const [processing, setProcessing] = createSignal(false);

  // QR state (owner-only)
  const [redeemUrl, setRedeemUrl] = createSignal<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = createSignal<string | null>(null);
  const [qrError, setQrError] = createSignal<string | null>(null);

  const tl = () => props.message.sender?.trustlevel ?? null;

  const isPending = () => props.message.message_type === "request";
  const isQrReady = () => props.message.message_type === "request_qr_ready";
  const isAccepted = () => props.message.message_type === "request_accepted";
  const isQrLink = () => isAccepted() && (props.message.content ?? "").startsWith("http");

  const statusInfo = createMemo(() => {
    switch (props.message.message_type) {
      case "request":
        return {
          icon: "🔔",
          text: "Möchte dieses Produkt testen",
          bgColor: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
          textColor: "text-amber-900 dark:text-amber-100",
        };
      case "request_qr_ready":
        return {
          icon: "📦",
          text: "QR-Code wurde erstellt (Aktivierung nötig)",
          bgColor: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
          textColor: "text-amber-900 dark:text-amber-100",
        };
      case "request_accepted":
        return {
          icon: "✅",
          text: "Aktiviert (Scan erfolgt)",
          bgColor: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
          textColor: "text-green-900 dark:text-green-100",
        };
      case "request_declined":
        return {
          icon: "❌",
          text: "Anfrage wurde abgelehnt",
          bgColor: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
          textColor: "text-red-900 dark:text-red-100",
        };
    }
  });

  const derived = createMemo(() => {
    const productId = props.message.product_id ?? null;
    const type = props.message.message_type;

    if (productId == null) return { productId: null as number | null, ownerId: null as number | null, testerId: null as number | null };

    if (type === "request") {
      return {
        productId,
        ownerId: props.message.receiver_id,
        testerId: props.message.sender_id,
        fallbackOwnerId: null,
        fallbackTesterId: null,
      };
    }

    return {
      productId,
      ownerId: props.message.sender_id,
      testerId: props.message.receiver_id,
      fallbackOwnerId: props.message.receiver_id,
      fallbackTesterId: props.message.sender_id,
    };
  });

  const shouldShowQr = createMemo(() => props.isOwner && isQrReady() && derived().productId != null);

  const handleAccept = async () => {
    if (!props.onAccept || !props.message.product_id) return;
    setProcessing(true);
    try {
      await props.onAccept(props.message.id, props.message.sender_id, props.message.product_id);
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!props.onDecline) return;
    setProcessing(true);
    try {
      await props.onDecline(props.message.id);
    } finally {
      setProcessing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (redeemUrl()) {
        await navigator.clipboard.writeText(redeemUrl()!);
        return;
      }
      if ((props.message.content ?? "").startsWith("http")) {
        await navigator.clipboard.writeText(props.message.content);
      }
    } catch {
      // ignore
    }
  };

  const handlePrint = () => window.print();

  createEffect(() => {
    const show = shouldShowQr();
    const d = derived();
    const productId = d.productId;
    const primaryOwnerId = d.ownerId;
    const primaryTesterId = d.testerId;
    const fallbackOwnerId = (d as any).fallbackOwnerId as number | null;
    const fallbackTesterId = (d as any).fallbackTesterId as number | null;

    setQrError(null);
    setRedeemUrl(null);
    setQrDataUrl(null);

    if (!show || productId == null || primaryOwnerId == null || primaryTesterId == null) return;

    (async () => {
      const tryFetch = async (ownerId: number, testerId: number) => {
        return supabase
          .from("ProductCommentTokens")
          .select("token, redeemed_at, created_at")
          .eq("product_id", productId)
          .eq("owner_user_id", ownerId)
          .eq("tester_user_id", testerId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
      };

      let res = await tryFetch(primaryOwnerId, primaryTesterId);

      if (!res.error && !res.data?.token && typeof fallbackOwnerId === "number" && typeof fallbackTesterId === "number") {
        res = await tryFetch(fallbackOwnerId, fallbackTesterId);
      }

      if (res.error) {
        setQrError(res.error.message);
        return;
      }

      if (!res.data?.token) {
        setQrError("Kein Token gefunden.");
        return;
      }

      const url = `${window.location.origin}/activate/${res.data.token}`;
      setRedeemUrl(url);

      try {
        const img = await QRCode.toDataURL(url);
        setQrDataUrl(img);
      } catch (e: any) {
        setQrError(e?.message ?? "QR konnte nicht erzeugt werden.");
      }
    })();
  });

  return (
    <div class={`flex ${props.isOwn ? "justify-end" : "justify-start"}`}>
      <div class={`flex gap-2 max-w-[70%] ${props.isOwn ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <div class="relative w-8 h-8 flex-shrink-0">
          <Show
            when={props.message.sender?.picture}
            fallback={
              <div class="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                {props.message.sender?.name?.charAt(0) ?? "?"}
              </div>
            }
          >
            <img
              src={props.message.sender!.picture!}
              alt={props.message.sender?.name}
              class="w-8 h-8 rounded-full object-cover shadow-md"
            />
          </Show>

          <Show when={tl() != null}>
            <div
              class="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] leading-[16px] text-center font-semibold bg-black/70 text-white"
              title={`Trustlevel ${tl()}`}
            >
              {tl() as number}
            </div>
          </Show>
        </div>

        {/* Content */}
        <div>
          <div class={`px-4 py-3 rounded-2xl shadow-md border-2 ${statusInfo().bgColor} ${props.isOwn ? "rounded-br-md" : "rounded-bl-md"}`}>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xl">{statusInfo().icon}</span>
              <span class={`font-semibold ${statusInfo().textColor}`}>{statusInfo().text}</span>
            </div>

            <Show
              when={!(isQrReady() && !props.isOwner)}
              fallback={
                <p class={`text-sm ${statusInfo().textColor} opacity-80`}>
                  QR-Code wurde erstellt und liegt dem Paket bei. Du kannst nach dem Scan kommentieren.
                </p>
              }
            >
              <p class={`text-sm ${statusInfo().textColor} opacity-80 break-all`}>{props.message.content}</p>
            </Show>

            <Show when={isQrLink()}>
              <div class="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  class="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Link kopieren
                </button>
              </div>
            </Show>

            <Show when={shouldShowQr()}>
              <div class="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                <div class="print-area">
                  <Show when={!qrError()} fallback={<p class="text-sm text-red-600">{qrError()}</p>}>
                    <Show when={qrDataUrl()} fallback={<p class="text-sm text-gray-500">QR wird geladen…</p>}>
                      <div class="flex items-center justify-center">
                        <img
                          src={qrDataUrl()!}
                          alt="QR Code"
                          class="bg-white rounded-lg p-2"
                          width={240}
                          height={240}
                        />
                      </div>

                      <p class="mt-3 text-xs text-amber-900/70 dark:text-amber-100/70 break-all">{redeemUrl()}</p>

                      <p class="mt-2 text-xs text-amber-900/70 dark:text-amber-100/70">
                        Drucke diesen QR-Code aus und lege ihn dem Produkt bei. Freischaltung erfolgt nach Scan.
                      </p>
                    </Show>
                  </Show>
                </div>

                <div class="mt-3 flex gap-2 print:!hidden">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    class="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Link kopieren
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    class="flex-1 px-3 py-2 bg-gray-800 hover:bg-black text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Drucken
                  </button>
                </div>
              </div>
            </Show>

            <Show when={isPending() && props.isOwner}>
              <div class="flex gap-2 mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                <button
                  onClick={handleAccept}
                  disabled={processing()}
                  class="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {processing() ? "..." : "✅ Akzeptieren"}
                </button>
                <button
                  onClick={handleDecline}
                  disabled={processing()}
                  class="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {processing() ? "..." : "❌ Ablehnen"}
                </button>
              </div>
            </Show>
          </div>

          <p class={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${props.isOwn ? "text-right" : ""}`}>
            {props.formatTime(props.message.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
