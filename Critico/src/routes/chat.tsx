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
    productOwnerId, // ✅ NEU
    loading,
    sending,
    handleSendMessage,
    handleAcceptRequest, // ✅ NEU
    handleDeclineRequest, // ✅ NEU
    formatTime,
    setMainContainerRef,
  } = useChat();


  return (
    <div class="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <ChatHeader chatPartner={chatPartner} />
      
      <MessagesList
        messages={messages}
        currentUserId={currentUserId}
        productOwnerId={productOwnerId} // ✅ NEU
        loading={loading}
        setMainContainerRef={setMainContainerRef}
        formatTime={formatTime}
        onAcceptRequest={handleAcceptRequest} // ✅ NEU
        onDeclineRequest={handleDeclineRequest} // ✅ NEU
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
