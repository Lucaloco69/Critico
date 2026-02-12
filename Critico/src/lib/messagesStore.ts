import { createSignal } from "solid-js";
import { supabase } from "./supabaseClient";
import { ChatPreview } from "~/types/chat";
import type { Message } from "~/hooks/useChat"; // ✅ Import Message type


const [unreadCounts, setUnreadCounts] = createSignal<Record<number, number>>({});

// ✅ Globale Chats Signals
const [chats, setChats] = createSignal<ChatPreview[]>([]);
const [filteredChats, setFilteredChats] = createSignal<ChatPreview[]>([]);

// ✅ NEU: Globale Chat Messages Signal
const [chatMessages, setChatMessages] = createSignal<Message[]>([]);


export const messagesStore = {
  unreadCounts,
  chats,
  filteredChats,
  chatMessages, // ✅ NEU
  
  setUnreadCount(chatId: number, count: number) {
    console.log("📊 messagesStore.setUnreadCount:", { chatId, count });
    setUnreadCounts(prev => ({ ...prev, [chatId]: count }));
  },
  
  getUnreadCount(chatId: number): number {
    const count = unreadCounts()[chatId] || 0;
    return count;
  },
  
  clearUnreadCount(chatId: number) {
    console.log("🧹 messagesStore.clearUnreadCount:", chatId);
    setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));
  },
  
  setChats(newChats: ChatPreview[]) {
    console.log("📋 messagesStore.setChats:", { count: newChats.length, firstUnread: newChats[0]?.unreadCount });
    setChats(newChats);
  },
  
  setFilteredChats(newChats: ChatPreview[]) {
    console.log("📋 messagesStore.setFilteredChats:", { count: newChats.length, firstUnread: newChats[0]?.unreadCount });
    setFilteredChats(newChats);
  },
  
  // ✅ NEU: Setter für Chat Messages
  setChatMessages(newMessages: Message[]) {
    console.log("💬 messagesStore.setChatMessages:", { 
      count: newMessages.length, 
      lastId: newMessages[newMessages.length - 1]?.id,
      lastContent: newMessages[newMessages.length - 1]?.content?.substring(0, 30)
    });
    setChatMessages(newMessages);
  },
  
  async markChatAsRead(chatId: number, userId: number) {
    try {
      console.log("📖 messagesStore.markChatAsRead START:", { chatId, userId });
      
      const { error } = await supabase
        .from("Messages")
        .update({ read: true })
        .eq("chat_id", chatId)
        .eq("receiver_id", userId)
        .eq("read", false);

      if (error) throw error;
      
      this.clearUnreadCount(chatId);
      
      console.log("✅ messagesStore.markChatAsRead SUCCESS:", chatId);
    } catch (err) {
      console.error("❌ messagesStore.markChatAsRead ERROR:", err);
    }
  }
};
