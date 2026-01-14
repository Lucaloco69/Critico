import { Accessor, Index, createEffect } from "solid-js";
import { ChatPreviewItem } from "./ChatPreviewItem";

interface ChatPreview {
  chatId: number;
  partnerId: number;
  partnerName: string;
  partnerSurname: string;
  partnerPicture: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface ChatsListContentProps {
  chats: Accessor<ChatPreview[]>;
  formatTime: (dateString: string) => string;
}

export function ChatsListContent(props: ChatsListContentProps) {
  // ✅ Track wenn props.chats sich ändert
 createEffect(() => {
  const chatList = props.chats();
  console.log("🔥 ChatsListContent Effect: Chats changed!", chatList.length, JSON.stringify(chatList));
});


  console.log("🏗️ ChatsListContent Component rendered");

  return (
    <Index each={props.chats()}>
      {(chat, i) => {
        console.log("🎨 Rendering chat:", chat().chatId, chat().lastMessage, chat().unreadCount);
        return (
          <>
            <ChatPreviewItem
              chat={chat()}
              formatTime={props.formatTime}
            />
            {i < props.chats().length - 1 && (
              <div class="border-t border-gray-200 dark:border-gray-700 mx-4" />
            )}
          </>
        );
      }}
    </Index>
  );
}
