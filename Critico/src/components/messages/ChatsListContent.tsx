/**
 * ChatsListContent
 * ----------------
 * Rendert den Inhalt der Chat-Liste als einfache, durch Linien getrennte Liste.
 *
 * - Iteriert über alle Chat-Previews (props.chats()) und rendert pro Eintrag ein <ChatPreviewItem>.
 * - Enthält keine eigene Logik außer dem Mapping/Rendering; Formatierung der Zeit wird als Callback
 *   (formatTime) an die Items weitergereicht.
 */

import { For, Accessor } from "solid-js";
import { ChatPreviewItem } from "./ChatPreviewItem";
import { ChatPreview } from "~/types/messages";


interface ChatsListContentProps {
  chats: Accessor<ChatPreview[]>;
  formatTime: (dateString: string) => string;
}

export function ChatsListContent(props: ChatsListContentProps) {
  return (
    <div class="divide-y divide-gray-200 dark:divide-gray-700">
      <For each={props.chats()}>
        {(chat) => (
          <ChatPreviewItem
            chat={chat}
            formatTime={props.formatTime}
          />
        )}
      </For>
    </div>
  );
}
