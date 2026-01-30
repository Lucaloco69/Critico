/**
 * Chat (Page)
 * -----------
 * Seitenkomponente für die Chat-Detailansicht mit einem bestimmten Chatpartner.
 *
 * - Nutzt den useChat() Hook, um Chat-Daten und Aktionen zu erhalten.
 * - Reicht relevante Props (currentUserId, getProductOwnerId, formatTime, setMainContainerRef, Handler)
 *   an die jeweiligen UI-Komponenten durch.
 */

import { ChatHeader } from "../components/chat/ChatHeader";
import { MessagesList } from "../components/chat/MessagesList";
import { MessageInput } from "../components/chat/MessageInput";
import { useChat } from "../hooks/useChat";

export default function Chat() {
  const {
    messages,
    newMessage,
    setNewMessage,
    chatPartner,
    currentUserId,

    // ✅ NEU: Owner pro Produkt (statt global productOwnerId)
    getProductOwnerId,

    loading,
    sending,
    handleSendMessage,
    handleAcceptRequest,
    handleDeclineRequest,
    formatTime,
    setMainContainerRef,
  } = useChat();

  return (
    <div class="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <ChatHeader chatPartner={chatPartner} />

      <MessagesList
        messages={messages}
        currentUserId={currentUserId}

        // ✅ NEU: Funktion statt Wert
        getProductOwnerId={getProductOwnerId}

        loading={loading}
        setMainContainerRef={setMainContainerRef}
        formatTime={formatTime}
        onAcceptRequest={handleAcceptRequest}
        onDeclineRequest={handleDeclineRequest}
      />

      <MessageInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        sending={sending}
        loading={loading}
        onSubmit={handleSendMessage}
      />
    </div>
  );
}
