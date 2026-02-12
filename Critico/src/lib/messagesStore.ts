import { createSignal } from "solid-js";
import { supabase } from "./supabaseClient";

const [updateTrigger, setUpdateTrigger] = createSignal(0);
const [unreadCounts, setUnreadCounts] = createSignal<Record<number, number>>({});
const [lastChatUpdate, setLastChatUpdate] = createSignal<{chatId: number, timestamp: number} | null>(null);

export const messagesStore = {
  updateTrigger,
  unreadCounts,
  
  triggerUpdate: () => {
    const newValue = updateTrigger() + 1;
    console.log("🔄 messagesStore.triggerUpdate:", newValue);
    setUpdateTrigger(newValue);
  },
  
  setUnreadCount(chatId: number, count: number) {
    console.log("📊 messagesStore.setUnreadCount:", { chatId, count });
    setUnreadCounts(prev => ({ ...prev, [chatId]: count }));
  },
  
  getUnreadCount(chatId: number): number {
    const count = unreadCounts()[chatId] || 0;
    console.log("📊 messagesStore.getUnreadCount:", { chatId, count });
    return count;
  },
  
  clearUnreadCount(chatId: number) {
    console.log("🧹 messagesStore.clearUnreadCount:", chatId);
    setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));
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
      this.triggerUpdate();
      
      console.log("✅ messagesStore.markChatAsRead SUCCESS:", chatId);
    } catch (err) {
      console.error("❌ messagesStore.markChatAsRead ERROR:", err);
    }
  },
  
  notifyChatUpdated(chatId: number) {
    const timestamp = Date.now();
    console.log("🔔🔔🔔 messagesStore.notifyChatUpdated CALLED:", { chatId, timestamp });
    console.trace("Stack trace:");
    
    const updateObj = { chatId, timestamp };
    setLastChatUpdate(updateObj);
    
    console.log("🔔 messagesStore.notifyChatUpdated - Signal gesetzt:", updateObj);
    console.log("🔔 messagesStore.notifyChatUpdated - Aktueller Wert:", lastChatUpdate());
    
    this.triggerUpdate();
  },
  
  getLastChatUpdate() {
    const value = lastChatUpdate();
    console.log("👀 messagesStore.getLastChatUpdate:", value);
    return value;
  }
};

// Debug: Log bei jeder Änderung des Signals
setInterval(() => {
  const current = lastChatUpdate();
  if (current) {
    console.log("⏰ messagesStore HEARTBEAT - lastChatUpdate:", current);
  }
}, 5000);
