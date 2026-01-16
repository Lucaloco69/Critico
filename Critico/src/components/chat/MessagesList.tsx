import { For, Show, Accessor } from "solid-js";
import type { Message } from "../../hooks/useChat";
import { MessageBubble } from "./MessageBubble";


interface Message {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  read: boolean;
  message_type?: "direct" | "request" | "request_accepted" | "request_declined" | "product";
  product_id?: number;
  User: {
    id: number;
    name: string;
    surname: string;
    picture: string | null;
  };
}


interface MessagesListProps {
  messages: Accessor<Message[]>;
  currentUserId: Accessor<number | null>;
  productOwnerId?: Accessor<number | null>; // ✅ NEU
  loading: Accessor<boolean>;
  setMainContainerRef: (el: HTMLElement | undefined) => void;
  formatTime: (dateString: string) => string;
  onAcceptRequest?: (messageId: number, senderId: number, productId: number) => Promise<void>; // ✅ NEU
  onDeclineRequest?: (messageId: number) => Promise<void>; // ✅ NEU
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
              <p class="text-gray-500 dark:text-gray-400">Noch keine Nachrichten. Starte die Unterhaltung!</p>
            </div>
          </Show>


          <For each={props.messages()}>
            {(message) => {
              const isOwn = message.sender_id === props.currentUserId();
              return (
                <MessageBubble
                  message={message}
                  isOwn={isOwn}
                  formatTime={props.formatTime}
                  productOwnerId={props.productOwnerId?.() ?? null}
                  currentUserId={props.currentUserId()}
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
