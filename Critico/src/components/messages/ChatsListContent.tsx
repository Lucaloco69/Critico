import { For, Accessor } from "solid-js";
import { ChatPreviewItem } from "./ChatPreviewItem";

interface ChatPreview {
  chatId: number;
  partnerId: number;
  partnerName: string;
  partnerSurname: string;
  partnerPicture: string | null;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageType?: string;
  unreadCount: number;
  hasUnreadRequest?: boolean;
}

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
