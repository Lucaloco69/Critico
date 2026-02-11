import { For, Accessor } from "solid-js";
import { ChatPreviewItem } from "./ChatPreviewItem";
import type { ChatPreview } from "~/types/chat";


interface ChatsListContentProps {
  chats: Accessor<ChatPreview[]>;
  formatTime: (dateString: string) => string;
}

export function ChatsListContent(props: ChatsListContentProps) {
  return (
    <div class="divide-y divide-gray-200 dark:divide-gray-700">
      <For each={props.chats()}>
        {(chat) => (
          <ChatPreviewItem
            chat={chat}
            formatTime={props.formatTime}
          />
        )}
      </For>
    </div>
  );
}
