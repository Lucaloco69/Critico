import { Show, Accessor, createEffect } from "solid-js";
import { ChatsListContent } from "./ChatsListContent";
import { EmptyChatsState } from "./EmptyChatsState";

export interface ChatPreview {
  chatId: number;
  partnerId: number;
  partnerName: string;
  partnerSurname: string;
  partnerPicture: string | null;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageType?: string; // ✅ NEU
  unreadCount: number;
  hasUnreadRequest?: boolean; // ✅ NEU
}


interface ChatsListProps {

  // Optional: falls du später Trustlevel/Emblem auch in der Chatliste zeigen willst
  partnerTrustlevel?: number | null;
}

export interface ChatsListProps {
  chats: Accessor<ChatPreview[]>;
  loading: Accessor<boolean>;
  searchQuery: Accessor<string>;
  formatTime: (dateString: string) => string;
}


export function ChatsList(props: ChatsListProps) {
  createEffect(() => {
    const chats = props.chats();
    console.log("🎨 ChatsList: Chats:", chats.length);
  });


  return (
    <>
      <Show when={props.loading()}>
        <div class="flex justify-center items-center py-20">
          <div class="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Show>


      <Show when={!props.loading()}>
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {props.chats().length === 0 ? (
            <EmptyChatsState searchQuery={props.searchQuery} />
          ) : (
            <ChatsListContent chats={props.chats} formatTime={props.formatTime} />
          )}
        </div>
      </Show>
    </>
  );
}
