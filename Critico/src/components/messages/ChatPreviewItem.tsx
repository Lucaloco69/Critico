import { A } from "@solidjs/router";
import { Show } from "solid-js";
import type { ChatPreview } from "./ChatsList";

interface ChatPreviewItemProps {
  chat: ChatPreview;
  formatTime: (dateString: string) => string;
}

const trustBadgeClass = (tl: number) => {
  if (tl >= 5) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
  if (tl >= 4) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
  if (tl >= 3) return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200";
  if (tl >= 2) return "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200";
  if (tl >= 1) return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
};

export function ChatPreviewItem(props: ChatPreviewItemProps) {
  const tl = () => props.chat.partnerTrustlevel;

  return (
    <A
      href={`/chat/${props.chat.partnerId}`}
      class="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      {/* Avatar */}
      <div class="relative flex-shrink-0">
        <div class="w-14 h-14 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
          {props.chat.partnerName.charAt(0)}
          {props.chat.partnerSurname.charAt(0)}
        </div>

        {/* TL Badge */}
        <Show when={tl() != null}>
          <div
            class={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow border border-white dark:border-gray-900 ${trustBadgeClass(
              tl() as number
            )}`}
            title={`Trustlevel ${tl()}`}
          >
            TL{tl()}
          </div>
        </Show>

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

        <p
          class={`text-sm truncate ${
            props.chat.unreadCount > 0
              ? "text-gray-900 dark:text-white font-medium"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          {props.chat.lastMessage}
        </p>
      </div>

      {/* Chevron */}
      <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </A>
  );
}
