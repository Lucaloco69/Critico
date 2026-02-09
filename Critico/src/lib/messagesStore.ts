import { createSignal } from "solid-js";
import { supabase } from "./supabaseClient";

const [updateTrigger, setUpdateTrigger] = createSignal(0);

// ✅ NEU: Unread Counts pro Chat
const [unreadCounts, setUnreadCounts] = createSignal<Record<number, number>>({});

export const messagesStore = {
  updateTrigger,
  unreadCounts,
  
  triggerUpdate: () => setUpdateTrigger(prev => prev + 1),
  
  // ✅ NEU: Setze unread count für einen Chat
  setUnreadCount(chatId: number, count: number) {
    setUnreadCounts(prev => ({ ...prev, [chatId]: count }));
  },
  
  // ✅ NEU: Hole unread count für einen Chat (reaktiv)
  getUnreadCount(chatId: number): number {
    return unreadCounts()[chatId] || 0;
  },
  
  // ✅ NEU: Setze Chat auf gelesen (0 unread)
  clearUnreadCount(chatId: number) {
    setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));
    console.log("✅ messagesStore: Unread count cleared für Chat:", chatId);
  },
  
  // ✅ NEU: Markiere Chat als gelesen in DB + Store
  async markChatAsRead(chatId: number, userId: number) {
    try {
      console.log("📖 messagesStore: Markiere Chat als gelesen:", chatId);
      
      const { error } = await supabase
        .from("Messages")
        .update({ read: true })
        .eq("chat_id", chatId)
        .eq("receiver_id", userId)
        .eq("read", false);

      if (error) throw error;
      
      // Update lokalen Store
      this.clearUnreadCount(chatId);
      
      // Trigger Update damit Messages-Liste neu lädt
      this.triggerUpdate();
      
      console.log("✅ messagesStore: Chat als gelesen markiert");
    } catch (err) {
      console.error("❌ messagesStore: Fehler beim Markieren:", err);
    }
  }
};
