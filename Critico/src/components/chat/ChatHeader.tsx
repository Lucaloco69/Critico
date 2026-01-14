import { Show, Accessor } from "solid-js";
import { useNavigate } from "@solidjs/router";

interface ChatPartner {
  id: number;
  name: string;
  surname: string;
  picture: string | null;
}

interface ChatHeaderProps {
  chatPartner: Accessor<ChatPartner | null>;
}

export function ChatHeader(props: ChatHeaderProps) {
  const navigate = useNavigate();

  return (
    <header class="bg-white dark:bg-gray-800 shadow-md flex-shrink-0">
      <div class="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <Show when={props.chatPartner()}>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
              {props.chatPartner()!.name.charAt(0)}{props.chatPartner()!.surname.charAt(0)}
            </div>
            <div>
              <h1 class="font-semibold text-gray-900 dark:text-white">
                {props.chatPartner()!.name} {props.chatPartner()!.surname}
              </h1>
            </div>
          </div>
        </Show>
      </div>
    </header>
  );
}
