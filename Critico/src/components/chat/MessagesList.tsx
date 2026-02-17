import { For, Show, Accessor, createEffect, Index } from "solid-js";
import type { Message } from "../../hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { t } from "../../lib/i18n";

interface MessagesListProps {
  messages: Accessor<Message[]>;
  currentUserId: Accessor<number | null>;
  loading: Accessor<boolean>;
  setMainContainerRef: (el: HTMLElement | undefined) => void;
  formatTime: (dateString: string) => string;
  onAcceptRequest?: (messageId: number, senderId: number, productId: number) => Promise<void>;
  onDeclineRequest?: (messageId: number) => Promise<void>;
  scrollToBottom: () => void;
}


export function MessagesList(props: MessagesListProps) {
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
              <p class="text-gray-500 dark:text-gray-400">{t("chatMessagesList.empty")}</p>
            </div>
          </Show>

          {/* ✅ For mit fallbackKey statt Index */}
          <For each={props.messages()} fallback={null}>
            {(message) => {
              const isOwn = message.sender_id === props.currentUserId();
              const perMessageOwnerId: number | null = message.product?.owner_id ?? null;

              return (
                <MessageBubble
                  message={message}
                  isOwn={isOwn}
                  formatTime={props.formatTime}
                  currentUserId={props.currentUserId()}
                  productOwnerId={perMessageOwnerId}
                  onAcceptRequest={props.onAcceptRequest}
                  onDeclineRequest={props.onDeclineRequest}
                  scrollToBottom={props.scrollToBottom}
                />
              );
            }}
          </For>
        </div>
      </Show>
    </main>
  );
}
