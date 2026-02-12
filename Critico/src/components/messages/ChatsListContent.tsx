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
    console.log("📋 ChatsListContent createEffect:", {
      count: chats.length,
      chats: chats.map(c => ({
        partnerId: c.partnerId,
        partnerName: c.partnerName,
        unreadCount: c.unreadCount,
        lastMessage: c.lastMessage.substring(0, 20)
      }))
    });
  });

  return (
    <div class="divide-y divide-gray-200 dark:divide-gray-700">
      <Index each={props.chats()}>
        {(chat, index) => {
          console.log("💬 Rendering ChatPreviewItem:", index, chat().partnerName, "unread:", chat().unreadCount);
          
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
