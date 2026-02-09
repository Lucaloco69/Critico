import { Show, createMemo, createEffect } from "solid-js";
import { RequestMessageBubble } from "./RequestMessageBubble";
import type { Message } from "../../hooks/useChat";

interface MessageBubbleProps {
  message: Message & {
    product?: { id: number; owner_id: number } | null;
  };
  isOwn: boolean;
  formatTime: (dateString: string) => string;

  // Owner pro Message (aus message.product?.owner_id)
  productOwnerId?: number | null;
  currentUserId?: number | null;

  onAcceptRequest?: (messageId: number, senderId: number, productId: number) => Promise<void>;
  onDeclineRequest?: (messageId: number) => Promise<void>;
}

export function MessageBubble(props: MessageBubbleProps) {
  const isRequestLike = createMemo(() => {
    const t = props.message.message_type;
    return t === "request" || t === "request_qr_ready" || t === "request_accepted" || t === "request_declined";
  });

  const isOwner = createMemo(() => {
    if (props.productOwnerId == null || props.currentUserId == null) return false;
    return Number(props.productOwnerId) === Number(props.currentUserId);
  });

  const shouldShowOwnerButtons = createMemo(() => {
    // Buttons nur für originale Request + Owner des Produkts + nicht eigene Nachricht
    return props.message.message_type === "request" && isOwner() && !props.isOwn;
  });

  createEffect(() => {
    console.log("🔍 MessageBubble owner/debug:", {
      messageId: props.message.id,
      messageType: props.message.message_type,
      messageProductId: props.message.product_id ?? null,
      productOwnerId: props.productOwnerId ?? null,
      currentUserId: props.currentUserId ?? null,
      isOwner: isOwner(),
      isOwn: props.isOwn,
      senderId: props.message.sender_id,
      SHOULD_SHOW_BUTTONS: shouldShowOwnerButtons(),
    });
  });

  const tl = () => props.message.sender?.trustlevel;

  return (
    <Show
      when={isRequestLike()}
      fallback={
        <div class={`flex ${props.isOwn ? "justify-end" : "justify-start"}`}>
          <div class={`flex gap-2 max-w-[70%] ${props.isOwn ? "flex-row-reverse" : ""}`}>
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
                  {tl()}
                </div>
              </Show>
            </div>

            <div>
              <div
                class={`px-4 py-2 rounded-2xl shadow-md ${
                  props.isOwn
                    ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                }`}
              >
                <p class="break-words">{props.message.content}</p>
              </div>

              <p class={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${props.isOwn ? "text-right" : ""}`}>
                {props.formatTime(props.message.created_at)}
              </p>
            </div>
          </div>
        </div>
      }
    >
      <RequestMessageBubble
        message={props.message as any}
        isOwn={props.isOwn}
        isOwner={isOwner()}
        formatTime={props.formatTime}
        onAccept={props.onAcceptRequest}
        onDecline={props.onDeclineRequest}
      />
    </Show>
  );
}
