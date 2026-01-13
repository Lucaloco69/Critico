import { Accessor, Setter, Show } from "solid-js";

interface MessageInputProps {
  newMessage: Accessor<string>;
  setNewMessage: Setter<string>;
  sending: Accessor<boolean>;
  loading: Accessor<boolean>;
  onSubmit: (e: Event) => void;
}

export function MessageInput(props: MessageInputProps) {
  return (
    <Show when={!props.loading()}>
      <footer class="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4 flex-shrink-0">
        <form onSubmit={props.onSubmit} class="max-w-5xl mx-auto flex gap-3">
          <input
            type="text"
            value={props.newMessage()}
            onInput={(e) => props.setNewMessage(e.currentTarget.value)}
            placeholder="Nachricht schreiben..."
            class="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            disabled={props.sending()}
          />
          <button
            type="submit"
            disabled={!props.newMessage().trim() || props.sending()}
            class="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Senden
          </button>
        </form>
      </footer>
    </Show>
  );
}
