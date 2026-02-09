import { For, Show, Accessor, createEffect } from "solid-js";
import type { Message } from "../../hooks/useChat";
import { MessageBubble } from "./MessageBubble";

interface MessagesListProps {
  messages: Accessor<Message[]>;
  currentUserId: Accessor<number | null>;
  loading: Accessor<boolean>;
  setMainContainerRef: (el: HTMLElement | undefined) => void;
  formatTime: (dateString: string) => string;
  onAcceptRequest?: (messageId: number, senderId: number, productId: number) => Promise<void>;
  onDeclineRequest?: (messageId: number) => Promise<void>;
}

export function MessagesList(props: MessagesListProps) {
  // Debug: zeigt, ob Messages mehrere Produkte enthalten (jetzt erlaubt),
  // aber du siehst sofort, ob product_id / owner_id fehlt.
  createEffect(() => {
    const msgs = props.messages();
    const productIds = Array.from(
      new Set(msgs.map((m: any) => m.product_id).filter((x): x is number => typeof x === "number"))
    );

    console.log("🧾 MessagesList debug (top):", {
      loading: props.loading(),
      currentUserId: props.currentUserId(),
      messagesCount: msgs.length,
      productIds,
      first: msgs[0]
        ? { id: msgs[0].id, type: msgs[0].message_type, product_id: (msgs[0] as any).product_id ?? null }
        : null,
      last: msgs[msgs.length - 1]
        ? {
            id: msgs[msgs.length - 1].id,
            type: msgs[msgs.length - 1].message_type,
            product_id: (msgs[msgs.length - 1] as any).product_id ?? null,
          }
        : null,
    });
  });

  return (
    <main ref={props.setMainContainerRef} class="flex-1 overflow-y-auto">
      <Show when={props.loading()}>
        <div class="flex h-full items-center justify-center">
          <div class="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Show>

      <Show when={!props.loading()}>
        <div class="px-4 py-6 space-y-4 max-w-5xl mx-auto w-full">
          <Show when={props.messages().length === 0}>
            <div class="text-center py-12">
              <p class="text-gray-500 dark:text-gray-400">Noch keine Nachrichten. Starte die Unterhaltung!</p>
            </div>
          </Show>

          <For each={props.messages()}>
            {(message: any) => {
              const isOwn = message.sender_id === props.currentUserId();

              // ✅ Owner pro Message: kommt aus embed `product.owner_id`
              // Falls du noch nicht gejoined hast, ist das null (dann keine Owner-Buttons).
              const perMessageOwnerId: number | null = message.product?.owner_id ?? null;

              // Debug pro Message
              createEffect(() => {
                console.log("📩 MessagesList per-message:", {
                  messageId: message.id,
                  type: message.message_type,
                  senderId: message.sender_id,
                  currentUserId: props.currentUserId(),
                  productId: message.product_id ?? null,
                  productOwnerId: perMessageOwnerId,
                  isOwn,
                  isOwnerByProduct:
                    perMessageOwnerId != null &&
                    props.currentUserId() != null &&
                    Number(perMessageOwnerId) === Number(props.currentUserId()),
                });
              });

              return (
                <MessageBubble
                  message={message}
                  isOwn={isOwn}
                  formatTime={props.formatTime}
                  currentUserId={props.currentUserId()}
                  productOwnerId={perMessageOwnerId}
                  onAcceptRequest={props.onAcceptRequest}
                  onDeclineRequest={props.onDeclineRequest}
                />
              );
            }}
          </For>
        </div>
      </Show>
    </main>
  );
}
