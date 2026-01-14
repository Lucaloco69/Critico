interface Message {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  read: boolean;
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
}

export function MessageBubble(props: MessageBubbleProps) {
  return (
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
    </div>
  );
}
