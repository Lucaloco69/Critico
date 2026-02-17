import { Index, Accessor, createEffect } from "solid-js";
import { ChatPreviewItem } from "./ChatPreviewItem";
import type { ChatPreview } from "~/types/chat";

interface ChatsListContentProps {
  chats: Accessor<ChatPreview[]>;
  formatTime: (dateString: string) => string;
}

export function ChatsListContent(props: ChatsListContentProps) {
  createEffect(() => {
    const chats = props.chats();
  });

  return (
    <div class="divide-y divide-gray-200 dark:divide-gray-700">
      <Index each={props.chats()}>
        {(chat, index) => {

          return (
            <ChatPreviewItem
              chat={chat()}
              formatTime={props.formatTime}
            />
          );
        }}
      </Index>
    </div>
  );
}
