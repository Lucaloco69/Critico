import { createEffect } from "solid-js";
import { MessagesHeader } from "../components/messages/MessagesHeader";
import { MessagesSearchBar } from "../components/messages/MessagesSearchBar";
import { ChatsList } from "../components/messages/ChatsList";
import { useMessages } from "../hooks/useMessages";
import { messagesStore } from "../lib/messagesStore";

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
