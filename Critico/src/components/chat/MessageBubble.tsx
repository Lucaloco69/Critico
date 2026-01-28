import { Show } from "solid-js";
import { RequestMessageBubble } from "./RequestMessageBubble";

type RequestType = "request" | "request_accepted" | "request_declined";

interface BaseMessage {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  read: boolean;
  product_id?: number;

  // ✅ kommt aus useChat (optional)
  qr_data_url?: string | null;

  sender: {
    id: number;
    name: string;
    surname: string;
    picture: string | null;
    trustlevel?: number | null;
  } | null;
}

type ChatMessage =
  | (BaseMessage & { message_type: "direct" })
  | (BaseMessage & { message_type: RequestType })
  | (BaseMessage & { message_type: "product" })
  | (BaseMessage & { message_type?: undefined });

type RequestMessage = BaseMessage & { message_type: RequestType };

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  formatTime: (dateString: string) => string;
  productOwnerId?: number | null;
  currentUserId?: number | null;
  onAcceptRequest?: (messageId: number, senderId: number, productId: number) => Promise<void>;
  onDeclineRequest?: (messageId: number) => Promise<void>;
}

// ✅ Type Guard
const isRequestMessageType = (m: ChatMessage): m is RequestMessage => {
  return m.message_type === "request" || m.message_type === "request_accepted" || m.message_type === "request_declined";
};

export function MessageBubble(props: MessageBubbleProps) {
  const isOwner = () => {
    if (props.productOwnerId == null || props.currentUserId == null) return false;
    return props.productOwnerId === props.currentUserId;
  };

  const tl = () => props.message.sender?.trustlevel;

  // ✅ IMPORTANT: <Show when> bekommt das "value", nicht boolean.
  const requestMsg = (): RequestMessage | undefined =>
    isRequestMessageType(props.message) ? props.message : undefined;

  return (
    <Show
      when={requestMsg()}
      fallback={
        <div class={`flex ${props.isOwn ? "justify-end" : "justify-start"}`}>
          <div class={`flex gap-2 max-w-[70%] ${props.isOwn ? "flex-row-reverse" : ""}`}>
            <div class="relative w-8 h-8 flex-shrink-0">
              <Show
                when={props.message.sender?.picture}
                fallback={
                  <div class="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {props.message.sender?.name?.charAt(0) ?? "?"}
                  </div>
                }
              >
                <img
                  src={props.message.sender!.picture!}
                  alt={props.message.sender?.name}
                  class="w-8 h-8 rounded-full object-cover shadow-md"
                />
              </Show>

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
          </div>
        </div>
      }
    >
      {(reqMsg) => (
        <RequestMessageBubble
          message={reqMsg()}
          isOwn={props.isOwn}
          isOwner={isOwner()}
          formatTime={props.formatTime}
          onAccept={props.onAcceptRequest}
          onDecline={props.onDeclineRequest}
        />
      )}
    </Show>
  );
}
