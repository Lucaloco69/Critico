import { A } from "@solidjs/router";
import { Show } from "solid-js";

interface ChatPreview {
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

interface ChatPreviewItemProps {
  chat: ChatPreview;
  formatTime: (dateString: string) => string;
}

export function ChatPreviewItem(props: ChatPreviewItemProps) {
  
  // ✅ Helper: Preview Text für verschiedene Message Types
  const getPreviewText = () => {
    const type = props.chat.lastMessageType;
    
    if (type === 'request') {
      return '🔔 Möchte Produkt testen';
    }
    if (type === 'request_accepted') {
      return '✅ Anfrage akzeptiert';
    }
    if (type === 'request_declined') {
      return '❌ Anfrage abgelehnt';
    }
    
    return props.chat.lastMessage;
  };

  // ✅ Helper: Text-Style für verschiedene Types
  const getPreviewStyle = () => {
    const type = props.chat.lastMessageType;
    
    if (type === 'request') {
      return "text-amber-600 dark:text-amber-400 font-semibold";
    }
    if (type === 'request_accepted') {
      return "text-green-600 dark:text-green-400 font-semibold";
    }
    if (type === 'request_declined') {
      return "text-red-600 dark:text-red-400 font-semibold";
    }
    
    return props.chat.unreadCount > 0
      ? "text-gray-900 dark:text-white font-medium"
      : "text-gray-600 dark:text-gray-400";
  };

  return (
    <A
      href={`/chat/${props.chat.partnerId}`}
      class="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      {/* Avatar */}
      <div class="relative flex-shrink-0">
        <div class="w-14 h-14 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
          {props.chat.partnerName.charAt(0)}{props.chat.partnerSurname.charAt(0)}
        </div>
        
        {/* Unread Badge */}
        <Show when={props.chat.unreadCount > 0}>
          <div class="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
            {props.chat.unreadCount}
          </div>
        </Show>
      </div>

      {/* Chat Info */}
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline justify-between mb-1">
          <h3 class="font-semibold text-gray-900 dark:text-white truncate">
            {props.chat.partnerName} {props.chat.partnerSurname}
          </h3>
          <span class="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
            {props.formatTime(props.chat.lastMessageTime)}
          </span>
        </div>

        <div class="flex items-center gap-2">
          {/* ✅ Request Badge */}
          <Show when={props.chat.hasUnreadRequest}>
            <span class="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-800">
              🔔 Request
            </span>
          </Show>

          {/* Last Message Preview */}
          <p class={`text-sm truncate ${getPreviewStyle()}`}>
            {getPreviewText()}
          </p>
        </div>
      </div>

      {/* Chevron */}
      <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </A>
  );
}
