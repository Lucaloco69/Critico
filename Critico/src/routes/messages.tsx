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

  // ✅ TEST: Wird der Effect überhaupt installiert?
  console.log("🔧 Installing createEffect NOW");
  let renderCount = 0;
  
  createEffect(() => {
    renderCount++;
    const chats = filteredChats();
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📄 MESSAGES PAGE: Effect triggered! Render:", renderCount);
    console.log("   Chats length:", chats.length);
    console.log("   Chats array:", chats); // ✅ Log komplettes Array
    if (chats.length > 0) {
      console.log("   First chat:", chats[0].partnerName);
      console.log("   First unread:", chats[0].unreadCount);
      console.log("   First timestamp:", (chats[0] as any)._timestamp);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  });

  console.log("🔧 createEffect installed!");
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
