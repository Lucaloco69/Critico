import { Show } from "solid-js";
import { RequestMessageBubble } from "./RequestMessageBubble";

interface Message {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  read: boolean;
  message_type?: "direct" | "request" | "request_accepted" | "request_declined" | "product";
  product_id?: number;
  User: {
    id: number;
    name: string;
    surname: string;
    picture: string | null;
  };
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  formatTime: (dateString: string) => string;
  productOwnerId?: number | null; // NEU: Product Owner ID
  currentUserId?: number | null; // NEU: Current User ID
  onAcceptRequest?: (messageId: number, senderId: number, productId: number) => Promise<void>;
  onDeclineRequest?: (messageId: number) => Promise<void>;
}

export function MessageBubble(props: MessageBubbleProps) {
  // Prüfe ob es eine Request Message ist
  const isRequestMessage = () => {
    const type = props.message.message_type;
    return type === "request" || type === "request_accepted" || type === "request_declined";
  };

  // Prüfe ob current user der Product Owner ist
  const isOwner = () => {
    return props.productOwnerId && props.currentUserId 
      ? props.productOwnerId === props.currentUserId 
      : false;
  };

  return (
    <Show
      when={isRequestMessage()}
      fallback={
        // Normale Message
        <div class={`flex ${props.isOwn ? "justify-end" : "justify-start"}`}>
          <div class={`flex gap-2 max-w-[70%] ${props.isOwn ? "flex-row-reverse" : ""}`}>
            <div class="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
              {props.message.User.name.charAt(0)}
            </div>
            <div>
              <div class={`px-4 py-2 rounded-2xl shadow-md ${
                props.isOwn
                  ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              }`}>
                <p class="break-words">{props.message.content}</p>
              </div>
              <p class={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${props.isOwn ? "text-right" : ""}`}>
                {props.formatTime(props.message.created_at)}
              </p>
            </div>
          </div>
  const tl = () => props.message.User?.trustlevel;

  return (
    <div class={`flex ${props.isOwn ? "justify-end" : "justify-start"}`}>
      <div class={`flex gap-2 max-w-[70%] ${props.isOwn ? "flex-row-reverse" : ""}`}>
        <div class="relative w-8 h-8 flex-shrink-0">
          <div class="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
            {props.message.User?.name?.charAt(0) ?? "?"}
          </div>

          <Show when={tl() != null}>
            <div
              class="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] leading-[16px] text-center font-semibold bg-black/70 text-white"
              title={`Trustlevel ${tl()}`}
            >
              {tl()}
            </div>
          </Show>
        </div>

        <div>
          <div
            class={`px-4 py-2 rounded-2xl shadow-md ${
              props.isOwn
                ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            }`}
          >
            <p class="break-words">{props.message.content}</p>
          </div>

          <p class={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${props.isOwn ? "text-right" : ""}`}>
            {props.formatTime(props.message.created_at)}
          </p>
        </div>
      }
    >
      {/* Request Message */}
      <RequestMessageBubble
        message={props.message as any}
        isOwn={props.isOwn}
        isOwner={isOwner()}
        formatTime={props.formatTime}
        onAccept={props.onAcceptRequest}
        onDecline={props.onDeclineRequest}
      />
    </Show>
  );
}
