/**
 * ChatsList
 * ---------
 * Container-Komponente für die Chat-Übersicht.
 *
 * - Zeigt während des Ladens (loading) einen Spinner.
 * - Sobald geladen: rendert entweder einen Empty-State (keine Chats bzw. Suchfilter ohne Treffer)
 *   oder die eigentliche Liste über <ChatsListContent>.
 * - Loggt zur Entwicklung die Anzahl der geladenen Chats per createEffect.
 * - Die eigentliche Darstellung einzelner Chats erfolgt in den Child-Komponenten; diese Komponente
 *   steuert nur Lade-/Leerzustände und Layout-Wrapper.
 */

import { Show, Accessor, createEffect } from "solid-js";
import { ChatsListContent } from "./ChatsListContent";
import { EmptyChatsState } from "./EmptyChatsState";
import { ChatPreview } from "~/types/messages";



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
