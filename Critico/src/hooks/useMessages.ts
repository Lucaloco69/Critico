import { createSignal, createEffect, onMount, onCleanup, batch } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";
import { badgeStore } from "../lib/badgeStore";
import { messagesStore } from "../lib/messagesStore";
import { ChatPreview } from "~/types/chat";
import { RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

let globalMessagesChannel: any = null;
let reloadTimeout: any = null;

export function useMessages() {
  const navigate = useNavigate();
  const location = useLocation();

  const [chats, setChats] = createSignal<ChatPreview[]>([]);
  const [filteredChats, setFilteredChats] = createSignal<ChatPreview[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);

  const { setDirectMessageCount } = badgeStore;

  console.log("🏗️ useMessages: Hook wird initialisiert");

  onMount(async () => {
    console.log("🚀 useMessages.onMount START");
    
    if (!isLoggedIn() || !sessionStore.user) {
      console.log("❌ useMessages.onMount: Nicht eingeloggt, redirect zu /login");
      navigate("/login");
      return;
    }

    try {
      const { data: userData } = await supabase
        .from("User")
        .select("id")
        .eq("auth_id", sessionStore.user.id)
        .single();

      if (userData) {
        console.log("✅ useMessages.onMount: User gefunden:", userData.id);
        setCurrentUserId(userData.id);
        await loadChats(userData.id);
        
        if (!globalMessagesChannel) {
          setupRealtime(userData.id);
        }
      }
    } catch (err) {
      console.error("❌ useMessages.onMount ERROR:", err);
    } finally {
      setLoading(false);
      console.log("✅ useMessages.onMount COMPLETE");
    }
  });

  createEffect(() => {
    const path = location.pathname;
    const userId = currentUserId();
    
    console.log("🔄 useMessages.createEffect (pathname):", { path, userId });
    
    if (path === "/messages" && userId) {
      console.log("🔄 useMessages: Zurück zur Messages-Seite, lade Chats neu");
      loadChats(userId);
    }
  });

  // ✅ Store-Update Listener
  createEffect(() => {
    console.log("👂 useMessages.createEffect (Store-Listener) TRIGGERED");
    
    const chatUpdate = messagesStore.getLastChatUpdate();
    const userId = currentUserId();
    
    console.log("👂 useMessages.createEffect (Store-Listener) - Daten:", {
      chatUpdate,
      userId,
      hasUpdate: !!chatUpdate,
      timestamp: chatUpdate?.timestamp || 0
    });
    
    if (userId && chatUpdate && chatUpdate.timestamp > 0) {
      console.log("✅✅✅ useMessages: Store-Update erkannt für Chat:", chatUpdate.chatId);
      console.log("⏰ useMessages: Update Timestamp:", new Date(chatUpdate.timestamp).toISOString());
      
      if (reloadTimeout) {
        console.log("⏳ useMessages: Clearing existing reload timeout");
        clearTimeout(reloadTimeout);
      }
      
      reloadTimeout = setTimeout(() => {
        console.log("🔄🔄🔄 useMessages: LOADING CHATS nach Store-Update...");
        loadChats(userId);
      }, 300);
    } else {
      console.log("⏭️ useMessages: Kein Store-Update oder User nicht geladen");
    }
  });

  onCleanup(() => {
    console.log("🧹 useMessages.onCleanup");
    if (reloadTimeout) clearTimeout(reloadTimeout);
    if (globalMessagesChannel) {
      supabase.removeChannel(globalMessagesChannel);
      globalMessagesChannel = null;
    }
  });

  const setupRealtime = (userId: number) => {
    console.log("🔌 useMessages.setupRealtime START for user:", userId);
    
    // ✅ Channel mit broadcast config erstellen
    globalMessagesChannel = supabase.channel(`messages-list-user-${userId}`, {
      config: {
        broadcast: { 
          self: true,
          ack: true
        }
      }
    });

    globalMessagesChannel
      // ✅ INSERT Event - empfangene Messages
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Messages",
          filter: `receiver_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("🔔 useMessages: INSERT Event (received)", payload);
          
          if (["direct", "request", "request_qr_ready", "request_accepted", "request_declined"].includes(payload.new.message_type)) {
            console.log("✅ useMessages: Relevante Message empfangen, reload!");
            
            if (reloadTimeout) clearTimeout(reloadTimeout);
            reloadTimeout = setTimeout(() => {
              loadChats(userId);
            }, 300);
          }
        }
      )
      // ✅ INSERT Event - gesendete Messages
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Messages",
          filter: `sender_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("🔔 useMessages: INSERT Event (sent)", payload);
          
          if (["direct", "request", "request_qr_ready", "request_accepted", "request_declined"].includes(payload.new.message_type)) {
            console.log("✅ useMessages: Eigene Message gesendet, reload!");
            
            if (reloadTimeout) clearTimeout(reloadTimeout);
            reloadTimeout = setTimeout(() => {
              loadChats(userId);
            }, 300);
          }
        }
      )
      // ✅ UPDATE Event - für message_type Changes
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Messages",
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("🔔 useMessages: UPDATE Event", payload);
          
          if (
            (payload.new.sender_id === userId || payload.new.receiver_id === userId) &&
            ["direct", "request", "request_qr_ready", "request_accepted", "request_declined"].includes(payload.new.message_type)
          ) {
            console.log("✅ useMessages: Relevantes UPDATE, reload!");
            
            if (reloadTimeout) clearTimeout(reloadTimeout);
            reloadTimeout = setTimeout(() => {
              loadChats(userId);
            }, 300);
          }
        }
      )
      // ✅ BROADCAST Event - für Accept/Decline
      .on(
        "broadcast",
        { event: "message_updated" },
        (payload: { payload: { messageId: number; chatId: number } }) => {
          console.log("🔔🔔🔔 useMessages: BROADCAST empfangen:", payload);
          
          console.log("✅ useMessages: Broadcast empfangen, reload Chats!");
          
          if (reloadTimeout) clearTimeout(reloadTimeout);
          reloadTimeout = setTimeout(() => {
            loadChats(userId);
          }, 300);
        }
      )
      .subscribe((status: string, err?: Error) => {
        console.log("📡 useMessages Channel Status:", {
          status,
          error: err,
          channelName: `messages-list-user-${userId}`,
          timestamp: new Date().toISOString()
        });
        
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          console.log("✅✅✅ useMessages: REALTIME CHANNEL AKTIV!");
        } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
          console.error("❌❌❌ useMessages: REALTIME CHANNEL GESCHLOSSEN!");
        } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
          console.error("❌❌❌ useMessages: REALTIME CHANNEL ERROR:", err);
        }
      });
    
    console.log("✅ useMessages.setupRealtime COMPLETE");
  };

const loadChats = async (userId: number) => {
  console.log("📥 Loading chats for user:", userId);
  const startTime = Date.now();
  
  try {
    const { data: userChats, error: chatsError } = await supabase
      .from("Chat_Participants")
      .select("chat_id")
      .eq("user_id", userId);

    if (chatsError) throw chatsError;

    if (!userChats || userChats.length === 0) {
      batch(() => {
        setChats([]);
        setFilteredChats([]);
        setDirectMessageCount(0);
      });
      return;
    }

    const chatIds = userChats.map(c => c.chat_id);

    const { data: allChatDetails } = await supabase
      .from("Chats")
      .select("id, product_id")
      .in("id", chatIds);

    const chatDetails = (allChatDetails || []).filter(c => c.product_id === null);

    if (chatDetails.length === 0) {
      batch(() => {
        setChats([]);
        setFilteredChats([]);
        setDirectMessageCount(0);
      });
      return;
    }

    const directChatIds = chatDetails.map(c => c.id);
    const chatPreviews: ChatPreview[] = [];
    let totalUnreadCount = 0;

    for (const chatId of directChatIds) {
      const { data: participants } = await supabase
        .from("Chat_Participants")
        .select(`
          user_id,
          User (
            id,
            name,
            surname,
            picture,
            trustlevel
          )
        `)
        .eq("chat_id", chatId)
        .neq("user_id", userId);

      if (!participants || participants.length === 0) {
        console.warn(`⚠️ Chat ${chatId}: Keine Partner gefunden`);
        continue;
      }

      // ✅ NULL CHECK: Partner könnte gelöscht sein
      const partner = participants[0].User as any;
      
      if (!partner || !partner.id) {
        console.warn(`⚠️ Chat ${chatId}: Partner User ist null oder gelöscht, überspringe`);
        continue;
      }

      const { data: lastMsg } = await supabase
        .from("Messages")
        .select("content, created_at, message_type")
        .eq("chat_id", chatId)
        .in("message_type", ["direct", "request", "request_qr_ready", "request_accepted", "request_declined"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: unreadMessages } = await supabase
        .from("Messages")
        .select("id, sender_id, receiver_id, read, content, message_type")
        .eq("chat_id", chatId)
        .in("message_type", ["direct", "request", "request_qr_ready", "request_accepted", "request_declined"])
        .eq("receiver_id", userId)
        .eq("read", false);

      const unreadCount = (unreadMessages || []).length;
      totalUnreadCount += unreadCount;
      
      messagesStore.setUnreadCount(chatId, unreadCount);

      const hasUnreadRequest = (unreadMessages || []).some(
        m => m.message_type === 'request' && !m.read
      );

      // ✅ Null-safe property access
      chatPreviews.push({
        chatId,
        partnerId: partner.id,
        partnerName: partner.name ?? "Unbekannt",
        partnerSurname: partner.surname ?? "",
        partnerPicture: partner.picture ?? null,
        lastMessage: lastMsg?.content || "Noch keine Nachrichten",
        lastMessageTime: lastMsg?.created_at || new Date().toISOString(),
        lastMessageType: lastMsg?.message_type,
        unreadCount: unreadCount,
        hasUnreadRequest: hasUnreadRequest,
        partnerTrustlevel: partner.trustlevel ?? 0,
      });
    }

    chatPreviews.sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    const currentSearch = searchQuery();

    let filtered: ChatPreview[];
    if (!currentSearch || currentSearch.trim() === "") {
      filtered = chatPreviews;
    } else {
      filtered = chatPreviews.filter((chat) =>
        `${chat.partnerName} ${chat.partnerSurname}`.toLowerCase().includes(currentSearch.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(currentSearch.toLowerCase())
      );
    }

    // ✅ Force complete re-render
    batch(() => {
      setChats([]);
      setFilteredChats([]);
      
      queueMicrotask(() => {
        setChats(chatPreviews.map(c => ({ ...c })));
        setFilteredChats(filtered.map(c => ({ ...c })));
        setDirectMessageCount(totalUnreadCount);
      });
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Loaded ${chatPreviews.length} chats (${totalUnreadCount} unread) in ${duration}ms`);
  } catch (err) {
    console.error("❌ Error loading chats:", err);
  }
};



  const handleSearchChange = (value: string | ((prev: string) => string)) => {
    const query = typeof value === 'function' ? value(searchQuery()) : value;
    setSearchQuery(query);
    
    console.log("🔍 useMessages.handleSearchChange:", query);
    
    const currentChats = chats();
    
    if (!query || query.trim() === "") {
      setFilteredChats([...currentChats]);
    } else {
      const filtered = currentChats.filter((chat) =>
        `${chat.partnerName} ${chat.partnerSurname}`.toLowerCase().includes(query.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredChats([...filtered]);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Gestern";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("de-DE", { weekday: "short" });
    } else {
      return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      });
    }
  };

  return {
    filteredChats,
    searchQuery,
    setSearchQuery: handleSearchChange,
    loading,
    formatTime,
  };
}
