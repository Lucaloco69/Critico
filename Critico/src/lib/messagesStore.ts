import { createSignal } from "solid-js";
import { supabase } from "./supabaseClient";
import { ChatPreview } from "~/types/chat";
import type { Message } from "~/types/messages"; // ✅ Import Message type from types


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
    setUnreadCounts(prev => ({ ...prev, [chatId]: count }));
  },

  getUnreadCount(chatId: number): number {
    const count = unreadCounts()[chatId] || 0;
    return count;
  },

  clearUnreadCount(chatId: number) {
    setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));
  },

  setChats(newChats: ChatPreview[]) {
    setChats(newChats);
  },

  setFilteredChats(newChats: ChatPreview[]) {
    setFilteredChats(newChats);
  },

  // ✅ NEU: Setter für Chat Messages
  setChatMessages(newMessages: Message[]) {
    setChatMessages(newMessages);
  },

  addMessage(message: Message) {
    setChatMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  },

  updateMessage(message: Message) {
    setChatMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, ...message } : m))
    );
  },

  upsertMessage(message: Message) {
    setChatMessages((prev) => {
      const exists = prev.some((m) => m.id === message.id);
      if (exists) {
        return prev.map((m) => (m.id === message.id ? { ...m, ...message } : m));
      }
      return [...prev, message];
    });
  },

  async markChatAsRead(chatId: number, userId: number) {
    try {

      const { error } = await supabase
        .from("Messages")
        .update({ read: true })
        .eq("chat_id", chatId)
        .eq("receiver_id", userId)
        .eq("read", false);

      if (error) throw error;

      this.clearUnreadCount(chatId);

      // Optimistically update local state
      setChatMessages((prev) =>
        prev.map(m => m.receiver_id === userId ? { ...m, read: true } : m)
      );


    } catch (err) {
      console.error("❌ messagesStore.markChatAsRead ERROR:", err);
    }
  }
};
