import { Accessor, Index, createEffect } from "solid-js";
import { ChatPreviewItem } from "./ChatPreviewItem";
import type { ChatPreview } from "./ChatsList";

interface ChatsListContentProps {
  chats: Accessor<ChatPreview[]>;
  formatTime: (dateString: string) => string;
}

export function ChatsListContent(props: ChatsListContentProps) {
  createEffect(() => {
    const chatList = props.chats();
    console.log("🔥 ChatsListContent Effect: Chats changed!", chatList.length);
  });

  return (
    <Index each={props.chats()}>
      {(chat, i) => (
        <>
          <ChatPreviewItem chat={chat()} formatTime={props.formatTime} />
          {i < props.chats().length - 1 && (
            <div class="border-t border-gray-200 dark:border-gray-700 mx-4" />
          )}
        </>
      )}
    </Index>
  );
}
