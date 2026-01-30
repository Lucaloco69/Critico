/**
 * RequestMessageBubble
 * --------------------
 * - QR-Code/Link wird **nur** für den Owner (Inserator) angezeigt.
 * - Der Tester sieht bei "request_accepted" nur den Status, nicht den Link/QR.
 * - Drucken: nutzt window.print() (öffnet Druckdialog). [web:569]
 * - Fürs Drucken markiert der QR-Block eine .print-area (deine globale @media print Regel blendet dann alles andere aus).
 */

import { Show, createSignal } from "solid-js";

interface RequestMessage {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  message_type: "request" | "request_accepted" | "request_declined";
  product_id?: number;

  // aus useChat (optional)
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
      await navigator.clipboard.writeText(props.message.content);
    } catch {
      // ignore
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusInfo = () => {
    switch (props.message.message_type) {
      case "request":
        return {
          icon: "🔔",
          text: "Möchte dieses Produkt testen",
          bgColor: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
          textColor: "text-amber-900 dark:text-amber-100",
        };
      case "request_accepted":
        return {
          icon: "✅",
          text: "Anfrage wurde akzeptiert",
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
  };

  const statusInfo = getStatusInfo();
  const tl = () => props.message.sender?.trustlevel;

  const isAccepted = () => props.message.message_type === "request_accepted";
  const isPending = () => props.message.message_type === "request";
  const isQrLink = () => isAccepted() && props.message.content?.startsWith("http");

  return (
    <div class={`flex ${props.isOwn ? "justify-end" : "justify-start"}`}>
      <div class={`flex gap-2 max-w-[70%] ${props.isOwn ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <div class="relative w-8 h-8 flex-shrink-0">
          <Show
            when={props.message.sender?.picture}
            fallback={
              <div class="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
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
              {tl()}
            </div>
          </Show>
        </div>

        {/* Content */}
        <div>
          <div class={`px-4 py-3 rounded-2xl shadow-md border-2 ${statusInfo.bgColor}`}>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xl">{statusInfo.icon}</span>
              <span class={`font-semibold ${statusInfo.textColor}`}>{statusInfo.text}</span>
            </div>

            {/* Tester soll bei accepted NICHT den Link sehen */}
            <Show
              when={!(isAccepted() && !props.isOwner)}
              fallback={
                <p class={`text-sm ${statusInfo.textColor} opacity-80`}>
                  Die Anfrage wurde akzeptiert.
                </p>
              }
            >
              <p class={`text-sm ${statusInfo.textColor} opacity-80 break-all`}>
                {props.message.content}
              </p>
            </Show>

            {/* QR + Print nur für Owner */}
            <Show when={props.isOwner && isQrLink()}>
              <div class="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                <div class="print-area">
                  <Show when={props.message.qr_data_url}>
                    <div class="flex items-center justify-center">
                      <img
                        src={props.message.qr_data_url!}
                        alt="QR Code"
                        class="bg-white rounded-lg p-2"
                        width={240}
                        height={240}
                      />
                    </div>
                  </Show>

                  <p class="mt-3 text-xs text-green-900/70 dark:text-green-100/70">
                    Drucke diesen QR-Code aus und lege ihn dem Produkt bei. Der Tester kann erst nach Aktivierung kommentieren.
                  </p>
                </div>

                {/* Buttons nicht drucken */}
                <div class="mt-3 flex gap-2 print:!hidden">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    class="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
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

            {/* Accept/Decline nur für Owner bei pending */}
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
