import { ChatHeader } from "../components/ChatHeader";
import { MessagesList } from "../components/MessagesList";
import { MessageInput } from "../components/MessageInput";
import { useChat } from "../hooks/useChat";

export default function Chat() {
  const {
    messages,
    newMessage,
    setNewMessage,
    chatPartner,
    currentUserId,
    loading,
    sending,
    handleSendMessage,
    formatTime,
    setMainContainerRef, // ✅ NEU
  } = useChat();

  return (
    <div class="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <ChatHeader chatPartner={chatPartner} />
      
      <MessagesList
        messages={messages}
        currentUserId={currentUserId}
        loading={loading}
        setMainContainerRef={setMainContainerRef} // ✅ GEÄNDERT
        formatTime={formatTime}
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
