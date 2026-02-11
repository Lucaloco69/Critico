import { createSignal, createEffect, onMount, onCleanup, batch } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";
import { badgeStore } from "../lib/badgeStore";
import { messagesStore } from "../lib/messagesStore";
import { ChatPreview } from "~/types/chat";

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

  onMount(async () => {
    if (!isLoggedIn() || !sessionStore.user) {
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
        setCurrentUserId(userData.id);
        await loadChats(userData.id);
        
        if (!globalMessagesChannel) {
          setupRealtime(userData.id);
        }
      }
    } catch (err) {
      console.error("Error loading user:", err);
    } finally {
      setLoading(false);
    }
  });

  createEffect(() => {
    const path = location.pathname;
    const userId = currentUserId();
    
    if (path === "/messages" && userId) {
      console.log("🔄 MESSAGES: Zurück zur Messages-Seite, lade Chats neu");
      loadChats(userId);
    }
  });

  onCleanup(() => {
    console.log("🧹 Messages: Cleanup aufgerufen");
    if (reloadTimeout) clearTimeout(reloadTimeout);
    if (globalMessagesChannel) {
      supabase.removeChannel(globalMessagesChannel);
      globalMessagesChannel = null;
    }
  });

  const setupRealtime = (userId: number) => {
    console.log("🔌 MESSAGES: Setting up Realtime for user:", userId);
    
    globalMessagesChannel = supabase
      .channel(`messages-list-user-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Messages",
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          console.log("🔔 MESSAGES: INSERT Event (received)", payload);
          
          if (["direct", "request", "request_qr_ready", "request_accepted", "request_declined"].includes(payload.new.message_type)) {
            console.log("✅ MESSAGES: Relevante Message, reload!");
            
            if (reloadTimeout) clearTimeout(reloadTimeout);
            reloadTimeout = setTimeout(() => {
              loadChats(userId);
            }, 300);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Messages",
          filter: `sender_id=eq.${userId}`,
        },
        (payload) => {
          console.log("🔔 MESSAGES: INSERT Event (sent)", payload);
          
          if (["direct", "request", "request_qr_ready", "request_accepted", "request_declined"].includes(payload.new.message_type)) {
            console.log("✅ MESSAGES: Eigene Message gesendet, reload!");
            
            if (reloadTimeout) clearTimeout(reloadTimeout);
            reloadTimeout = setTimeout(() => {
              loadChats(userId);
            }, 300);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Messages",
        },
        (payload) => {
          console.log("🔔 MESSAGES: UPDATE Event", payload);
          
          if (
            (payload.new.sender_id === userId || payload.new.receiver_id === userId) &&
            ["direct", "request", "request_qr_ready", "request_accepted", "request_declined"].includes(payload.new.message_type)
          ) {
            console.log("✅ MESSAGES: Relevantes UPDATE, reload!");
            
            if (reloadTimeout) clearTimeout(reloadTimeout);
            reloadTimeout = setTimeout(() => {
              loadChats(userId);
            }, 300);
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 MESSAGES Channel Status:", status);
      });
  };

  const loadChats = async (userId: number) => {
    try {
      console.log("📥 MESSAGES: Loading chats for user:", userId);
      
      const { data: userChats, error: chatsError } = await supabase
        .from("Chat_Participants")
        .select("chat_id")
        .eq("user_id", userId);

      if (chatsError) throw chatsError;

      if (!userChats || userChats.length === 0) {
        console.log("⚠️ MESSAGES: Keine Chats gefunden");
        batch(() => {
          setChats([]);
          setFilteredChats([]);
          setDirectMessageCount(0);
        });
        return;
      }

      const chatIds = userChats.map(c => c.chat_id);
      console.log("📋 MESSAGES: Chat IDs:", chatIds);

      const { data: allChatDetails } = await supabase
        .from("Chats")
        .select("id, product_id")
        .in("id", chatIds);

      const chatDetails = (allChatDetails || []).filter(c => c.product_id === null);
      console.log("💬 MESSAGES: Direct Chats:", chatDetails.length);

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
        console.log(`🔍 MESSAGES: Verarbeite Chat ${chatId}`);
        
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
          console.log(`⚠️ MESSAGES: Keine Partner für Chat ${chatId}`);
          continue;
        }

        // ✅ NULL CHECK!
        const partner = participants[0].User as any;
        
        if (!partner || !partner.id) {
          console.warn(`⚠️ MESSAGES: Chat ${chatId} - Partner User ist null oder gelöscht, überspringe`);
          continue;
        }

        console.log(`👥 MESSAGES: Chat ${chatId} Partner:`, partner.name);

        const { data: lastMsg, error: lastMsgError } = await supabase
          .from("Messages")
          .select("content, created_at, message_type")
          .eq("chat_id", chatId)
          .in("message_type", ["direct", "request", "request_qr_ready", "request_accepted", "request_declined"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMsgError) {
          console.error(`❌ MESSAGES: Fehler beim Laden der letzten Nachricht für Chat ${chatId}:`, lastMsgError);
        }

        console.log(`💬 MESSAGES: Chat ${chatId} Letzte Nachricht:`, lastMsg?.content || "Keine");

        const { data: unreadMessages, error: unreadError } = await supabase
          .from("Messages")
          .select("id, sender_id, receiver_id, read, content, message_type")
          .eq("chat_id", chatId)
          .in("message_type", ["direct", "request", "request_qr_ready", "request_accepted", "request_declined"])
          .eq("receiver_id", userId)
          .eq("read", false);

        if (unreadError) {
          console.error(`❌ MESSAGES: Fehler beim Laden ungelesener Nachrichten für Chat ${chatId}:`, unreadError);
        }

        const unreadCount = (unreadMessages || []).length;
        totalUnreadCount += unreadCount;
        
        messagesStore.setUnreadCount(chatId, unreadCount);
        
        console.log(`📬 MESSAGES: Chat ${chatId} - Ungelesene Nachrichten:`, unreadCount);
        
        if (unreadMessages && unreadMessages.length > 0) {
          console.log("📋 MESSAGES: Ungelesene Details:", unreadMessages);
        }

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

        console.log(`✅ MESSAGES: Chat ${chatId} Preview erstellt - Unread Count:`, unreadCount);
      }

      chatPreviews.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      console.log("📊 MESSAGES: Insgesamt", chatPreviews.length, "Chats geladen");
      console.log("📬 MESSAGES: Total ungelesene Nachrichten:", totalUnreadCount);

      const currentSearch = searchQuery();
      console.log("🔍 MESSAGES: Aktueller Suchbegriff:", currentSearch);

      let filtered: ChatPreview[];
      if (!currentSearch || currentSearch.trim() === "") {
        filtered = chatPreviews;
        console.log("✅ MESSAGES: Kein Filter aktiv");
      } else {
        filtered = chatPreviews.filter((chat) =>
          `${chat.partnerName} ${chat.partnerSurname}`.toLowerCase().includes(currentSearch.toLowerCase()) ||
          chat.lastMessage.toLowerCase().includes(currentSearch.toLowerCase())
        );
        console.log("✅ MESSAGES: Filter angewendet:", filtered.length, "von", chatPreviews.length);
      }

      console.log("🔄 MESSAGES: Setze alle States...");
      
      batch(() => {
        setChats([...chatPreviews]);
        setFilteredChats([...filtered]);
        setDirectMessageCount(totalUnreadCount);
      });

      console.log("✅ MESSAGES: Alle States aktualisiert!");
    } catch (err) {
      console.error("Error loading chats:", err);
    }
  };

  const handleSearchChange = (value: string | ((prev: string) => string)) => {
    const query = typeof value === 'function' ? value(searchQuery()) : value;
    setSearchQuery(query);
    
    console.log("🔍 SEARCH: Query changed:", query);
    
    const currentChats = chats();
    
    if (!query || query.trim() === "") {
      setFilteredChats([...currentChats]);
      console.log("✅ SEARCH: Kein Filter, zeige alle", currentChats.length, "Chats");
    } else {
      const filtered = currentChats.filter((chat) =>
        `${chat.partnerName} ${chat.partnerSurname}`.toLowerCase().includes(query.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredChats([...filtered]);
      console.log("✅ SEARCH: Filter angewendet:", filtered.length, "von", currentChats.length);
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
