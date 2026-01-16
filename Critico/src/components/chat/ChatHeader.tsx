import { Show, Accessor } from "solid-js";
import { useNavigate } from "@solidjs/router";

interface ChatPartner {
  id: number;
  name: string;
  surname: string;
  picture: string | null;
  trustlevel?: number | null; // ✅ hinzufügen
}

interface ChatHeaderProps {
  chatPartner: Accessor<ChatPartner | null>;
}

const trustBadgeClass = (tl: number) => {
  if (tl >= 5) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
  if (tl >= 4) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
  if (tl >= 3) return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200";
  if (tl >= 2) return "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200";
  if (tl >= 1) return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
};

export function ChatHeader(props: ChatHeaderProps) {
  const navigate = useNavigate();

  const tl = () => props.chatPartner()?.trustlevel ?? null;

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
              {props.chatPartner()!.name.charAt(0)}
              {props.chatPartner()!.surname.charAt(0)}
            </div>

            <div class="flex items-center gap-2">
              <h1 class="font-semibold text-gray-900 dark:text-white">
                {props.chatPartner()!.name} {props.chatPartner()!.surname}
              </h1>

              <Show when={tl() != null}>
                <span
                  class={`px-2 py-0.5 rounded-full text-[11px] font-bold border border-white dark:border-gray-900 ${trustBadgeClass(
                    tl() as number
                  )}`}
                  title={`Trustlevel ${tl()}`}
                >
                  TL{tl()}
                </span>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </header>
  );
}
