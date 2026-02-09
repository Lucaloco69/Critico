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
