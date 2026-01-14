import { For, Show, Accessor } from "solid-js";
import { MessageBubble } from "./MessageBubble";

interface Message {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  read: boolean;
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
  loading: Accessor<boolean>;
  setMainContainerRef: (el: HTMLElement | undefined) => void; // ✅ GEÄNDERT
  formatTime: (dateString: string) => string;
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
              <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p class="text-gray-500 dark:text-gray-400">
                Noch keine Nachrichten. Starte die Unterhaltung!
              </p>
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
                />
              );
            }}
          </For>
        </div>
      </Show>
    </main>
  );
}
