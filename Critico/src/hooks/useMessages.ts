import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";
import { badgeStore } from "../lib/badgeStore";
import { messagesStore } from "../lib/messagesStore";
import { ChatPreview } from "../types/chat";
import { RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { formatChatTime } from "../lib/dateUtils";
import { VALID_CHAT_MESSAGE_TYPES, MESSAGE_TYPES } from "../types/messages";

let globalMessagesChannel: any = null;
let reloadTimeout: any = null;
let loadChatsTimeout: any = null;


export function useMessages() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Verwende globalen Store statt lokale Signals
  const { filteredChats } = messagesStore;

  const [searchQuery, setSearchQuery] = createSignal("");
  // ✅ FIX: Nur laden, wenn Store leer ist, sonst sofort anzeigen
  const [loading, setLoading] = createSignal(messagesStore.chats().length === 0);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);


  const { setDirectMessageCount } = badgeStore;





  createEffect(async () => {
    const currentUser = sessionStore.user;
    if (!isLoggedIn() || !currentUser) return;

    try {
      const { data: userData } = await supabase
        .from("User")
        .select("id")
        .eq("auth_id", currentUser.id)
        .single();

      if (userData) {
        setCurrentUserId(userData.id);
        loadChatsDebounced(userData.id);

        if (!globalMessagesChannel) {
          setupRealtime(userData.id);
        }
      }
    } catch (err) {
      console.error("❌ useMessages ERROR:", err);
      setLoading(false);
    }
  });


  createEffect(() => {
    const path = location.pathname;
    const userId = currentUserId();

    if (path === "/messages" && userId) {
      loadChatsDebounced(userId);
    }
  });


  onCleanup(() => {
    if (reloadTimeout) clearTimeout(reloadTimeout);
    if (loadChatsTimeout) clearTimeout(loadChatsTimeout);
    if (globalMessagesChannel) {
      supabase.removeChannel(globalMessagesChannel);
      globalMessagesChannel = null;
    }
  });


  const setupRealtime = (userId: number) => {

    globalMessagesChannel = supabase.channel(`messages-list-user-${userId}`, {
      config: {
        broadcast: {
          self: true,
          ack: true
        }
      }
    });


    globalMessagesChannel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Messages",
          filter: `receiver_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {

          if (reloadTimeout) clearTimeout(reloadTimeout);
          reloadTimeout = setTimeout(() => {
            loadChatsDebounced(userId);
          }, 300);
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
        (payload: RealtimePostgresChangesPayload<any>) => {

          if (reloadTimeout) clearTimeout(reloadTimeout);
          reloadTimeout = setTimeout(() => {
            loadChatsDebounced(userId);
          }, 300);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Messages",
          filter: `receiver_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Only reload if it's a valid chat message type
          if (payload.new && VALID_CHAT_MESSAGE_TYPES.includes(payload.new.message_type)) {
            if (reloadTimeout) clearTimeout(reloadTimeout);
            reloadTimeout = setTimeout(() => {
              loadChatsDebounced(userId);
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
          filter: `sender_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Only reload if it's a valid chat message type
          if (payload.new && VALID_CHAT_MESSAGE_TYPES.includes(payload.new.message_type)) {
            if (reloadTimeout) clearTimeout(reloadTimeout);
            reloadTimeout = setTimeout(() => {
              loadChatsDebounced(userId);
            }, 300);
          }
        }
      )
      .on(
        "broadcast",
        { event: "message_updated" },
        (payload: { payload: { messageId: number; chatId: number } }) => {

          if (reloadTimeout) clearTimeout(reloadTimeout);
          reloadTimeout = setTimeout(() => {
            loadChatsDebounced(userId);
          }, 300);
        }
      )
      .subscribe((status: string, err?: Error) => {

        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          // Connected
        } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
          console.warn("⚠️ useMessages: Realtime channel closed. Attempting reconnect...");
          // Try to reconnect after 2s
          setTimeout(() => {
            if (currentUserId()) setupRealtime(currentUserId()!);
          }, 2000);
        } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
          console.error("❌ useMessages: Realtime channel error:", err);
          // Try to reconnect after 5s
          setTimeout(() => {
            if (currentUserId()) setupRealtime(currentUserId()!);
          }, 5000);
        }
      });

  };


  const loadChatsDebounced = (userId: number) => {

    if (loadChatsTimeout) {
      clearTimeout(loadChatsTimeout);
    }

    loadChatsTimeout = setTimeout(() => {
      loadChats(userId);
    }, 100);
  };


  const loadChats = async (userId: number) => {
    const startTime = Date.now();

    try {
      const { data: userChats, error: chatsError } = await supabase
        .from("Chat_Participants")
        .select("chat_id")
        .eq("user_id", userId);

      if (chatsError) throw chatsError;

      if (!userChats || userChats.length === 0) {
        messagesStore.setChats([]);
        messagesStore.setFilteredChats([]);
        setDirectMessageCount(0);
        return;
      }

      const chatIds = userChats.map(c => c.chat_id);

      const { data: allChatDetails } = await supabase
        .from("Chats")
        .select("id, product_id")
        .in("id", chatIds);

      const chatDetails = (allChatDetails || []).filter(c => c.product_id === null);

      if (chatDetails.length === 0) {
        messagesStore.setChats([]);
        messagesStore.setFilteredChats([]);
        setDirectMessageCount(0);
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


      // ✅ Verwende globalen Store
      messagesStore.setChats(chatPreviews);
      messagesStore.setFilteredChats(filtered);
      setDirectMessageCount(totalUnreadCount);

      const duration = Date.now() - startTime;
    } catch (err) {
      console.error("❌ Error loading chats:", err);
    } finally {
      // ✅ WICHTIG: Loading erst false, wenn alles fertig ist
      setLoading(false);
    }
  };


  const handleSearchChange = (value: string | ((prev: string) => string)) => {
    const query = typeof value === 'function' ? value(searchQuery()) : value;
    setSearchQuery(query);

    const currentChats = messagesStore.chats();

    if (!query || query.trim() === "") {
      messagesStore.setFilteredChats([...currentChats]);
    } else {
      const filtered = currentChats.filter((chat) =>
        `${chat.partnerName} ${chat.partnerSurname}`.toLowerCase().includes(query.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(query.toLowerCase())
      );
      messagesStore.setFilteredChats([...filtered]);
    }
  };



  return {
    filteredChats,
    searchQuery,
    setSearchQuery: handleSearchChange,
    loading,
    formatTime: formatChatTime,
  };
}
