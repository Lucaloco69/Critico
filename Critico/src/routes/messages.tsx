/**
 * Messages (Page)
 * ---------------
 * Nachrichten-Übersichtsseite: zeigt die Chat-Liste, bietet Suche und nutzt einen Hook für Daten/Logik.
 *
 * - Bezieht Chat-Daten und UI-State aus useMessages(): filteredChats (Accessor), searchQuery, setSearchQuery,
 *   loading und formatTime, sodass die Seite selbst “dünn” bleibt und Logik im Hook gekapselt ist.
 * - Verwendet createEffect, um Änderungen an filteredChats() zu beobachten und Debug-Logs auszugeben;
 *   createEffect läuft initial einmal und danach immer dann erneut, wenn sich genutzte reaktive Abhängigkeiten
 *   ändern (hier: filteredChats()). [web:230]
 * - Rendert das Layout aus MessagesHeader, MessagesSearchBar (gesteuert über searchQuery/setSearchQuery) und
 *   ChatsList (erhält chats, loading, searchQuery und formatTime zur Anzeige/Formatierung).
 */

import { createEffect } from "solid-js";
import { MessagesHeader } from "../components/messages/MessagesHeader";
import { MessagesSearchBar } from "../components/messages/MessagesSearchBar";
import { ChatsList } from "../components/messages/ChatsList";
import { useMessages } from "../hooks/useMessages";

export default function Messages() {

    console.log("🏠 MESSAGES COMPONENT: Rendering...");

  const {
    filteredChats,
    searchQuery,
    setSearchQuery,
    loading,
    formatTime,
  } = useMessages();

  // ✅ Track filteredChats changes
  createEffect(() => {
  const chats = filteredChats();
  console.log("📄 MESSAGES PAGE: filteredChats changed!", chats.length);
  if (chats.length > 0) {
    console.log("📄 MESSAGES PAGE: First chat:", JSON.stringify(chats[0]));
  }
});

console.log("🏠 MESSAGES COMPONENT: Nach createEffect");

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MessagesHeader />

      <main class="max-w-5xl mx-auto px-4 py-6">
        <MessagesSearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <ChatsList
          chats={filteredChats}
          loading={loading}
          searchQuery={searchQuery}
          formatTime={formatTime}
        />
      </main>
    </div>
  );
}
