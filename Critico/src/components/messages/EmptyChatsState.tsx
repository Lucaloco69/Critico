/**
 * EmptyChatsState
 * --------------
 * Zeigt den Leerzustand der Chat-Übersicht an.
 *
 * - Wenn ein Suchbegriff aktiv ist (searchQuery nicht leer): zeigt "Keine Ergebnisse gefunden"
 *   und einen Hinweis, den Suchbegriff zu ändern.
 * - Wenn kein Suchbegriff aktiv ist: zeigt "Noch keine Chats" sowie einen Call-to-Action Link zur
 *   Startseite (/home), um neue Unterhaltungen zu starten.
 * - Nutzt Solid Router <A> für Navigation und <Show> für bedingtes Rendering.
 */

import { A } from "@solidjs/router";
import { Show, Accessor } from "solid-js";

interface EmptyChatsStateProps {
  searchQuery: Accessor<string>;
}

export function EmptyChatsState(props: EmptyChatsStateProps) {
  return (
    <div class="text-center py-20 px-4">
      <svg class="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {props.searchQuery() ? "Keine Ergebnisse gefunden" : "Noch keine Chats"}
      </h3>
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        {props.searchQuery() 
          ? "Versuche es mit einem anderen Suchbegriff"
          : "Kontaktiere Produktbesitzer, um Unterhaltungen zu starten"
        }
      </p>
      <Show when={!props.searchQuery()}>
        <A
          href="/home"
          class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Zur Startseite
        </A>
      </Show>
    </div>
  );
}
