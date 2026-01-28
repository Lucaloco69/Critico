/**
 * useMessages
 * ----------
 * Custom Hook für die Nachrichten-/Chat-Übersichtsseite (Inbox).
 *
 * - Prüft beim Mount den Login-Status, mapped auth_id -> User.id und lädt anschließend alle Direct-Chats
 *   des Users (über Chat_Participants + Chats, gefiltert auf product_id === null).
 * - Baut für jeden Chat ein ChatPreview-Objekt (Partnerdaten, letzte Nachricht inkl. message_type, Zeit,
 *   Anzahl ungelesener Nachrichten und ob eine ungelesene Request vorhanden ist).
 * - Berechnet die Gesamtzahl ungelesener Nachrichten und schreibt sie in den badgeStore
 *   (setDirectMessageCount) für das Header-Badge.
 * - Richtet eine globale Supabase Realtime Subscription auf INSERT/UPDATE der Tabelle "Messages" ein,
 *   um die Chat-Liste automatisch zu aktualisieren, wenn neue Nachrichten/Status-Änderungen eintreffen.
 * - Unterstützt Suche: hält searchQuery und erzeugt filteredChats basierend auf Name des Partners oder
 *   Text der letzten Nachricht; handleSearchChange aktualisiert den Filter.
 * - Stellt formatTime bereit, um Zeitstempel in der Chat-Liste kontextabhängig darzustellen
 *   (Uhrzeit / Gestern / Wochentag / Datum).
 *
 * Hinweis: Nutzt batch() um mehrere Signal-Updates zusammenzufassen und unnötige Re-Renders zu vermeiden.
 */

import { createSignal, createEffect, onMount, onCleanup, batch } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";
import { badgeStore } from "../lib/badgeStore";
import { ChatPreview } from "~/types/messages";

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


  createEffect(() => {
    try {
      const count = badgeStore.directMessageCount();
      const userId = currentUserId();
      const path = location.pathname;
      
      if (path === "/messages" && userId && count > 0) {
        console.log("🔄 BADGE CHANGED! Reloading chats... Count:", count);
        loadChats(userId);
      }
    } catch (err) {
      console.error("❌ Badge Effect Error:", err);
    }
  });



  onCleanup(() => {
    console.log("🧹 Messages: Cleanup aufgerufen");
    if (reloadTimeout) clearTimeout(reloadTimeout);
  });


  const setupRealtime = (userId: number) => {
    console.log("🔌 Messages: Setting up Realtime subscription");
    
    globalMessagesChannel = supabase
      .channel('all-direct-messages')
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Messages",
        },
        (payload) => {
          console.log("🔔 Messages: INSERT Event - Neue Nachricht", payload);
          
          // Nur reload wenn es direct oder request ist
          if (["direct", "request", "request_accepted", "request_declined"].includes(payload.new.message_type)) {
            loadChats(userId);
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
          console.log("🔔 Messages: UPDATE Event", payload);
          
          if (["direct", "request", "request_accepted", "request_declined"].includes(payload.new.message_type)) {
            if (reloadTimeout) clearTimeout(reloadTimeout);
            reloadTimeout = setTimeout(() => {
              console.log("🔄 Reloading chats nach UPDATE...");
              loadChats(userId);
            }, 500);
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Messages Channel Status:", status);
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
              picture
            )
          `)
          .eq("chat_id", chatId)
          .neq("user_id", userId);


        if (!participants || participants.length === 0) {
          console.log(`⚠️ MESSAGES: Keine Partner für Chat ${chatId}`);
          continue;
        }


        const partner = participants[0].User as any;
        console.log(`👥 MESSAGES: Chat ${chatId} Partner:`, partner.name);


        // ✅ GEÄNDERT: message_type hinzugefügt + filter auf alle types
        const { data: lastMsg, error: lastMsgError } = await supabase
          .from("Messages")
          .select("content, created_at, message_type")
          .eq("chat_id", chatId)
          .in("message_type", ["direct", "request", "request_accepted", "request_declined"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();


        if (lastMsgError) {
          console.error(`❌ MESSAGES: Fehler beim Laden der letzten Nachricht für Chat ${chatId}:`, lastMsgError);
        }


        console.log(`💬 MESSAGES: Chat ${chatId} Letzte Nachricht:`, lastMsg?.content || "Keine");


        // ✅ GEÄNDERT: message_type hinzugefügt + filter auf alle types
        const { data: unreadMessages, error: unreadError } = await supabase
          .from("Messages")
          .select("id, sender_id, receiver_id, read, content, message_type")
          .eq("chat_id", chatId)
          .in("message_type", ["direct", "request", "request_accepted", "request_declined"])
          .eq("receiver_id", userId)
          .eq("read", false);


        if (unreadError) {
          console.error(`❌ MESSAGES: Fehler beim Laden ungelesener Nachrichten für Chat ${chatId}:`, unreadError);
        }


        const unreadCount = (unreadMessages || []).length;
        totalUnreadCount += unreadCount;
        
        console.log(`📬 MESSAGES: Chat ${chatId} - Ungelesene Nachrichten:`, unreadCount);
        
        if (unreadMessages && unreadMessages.length > 0) {
          console.log("📋 MESSAGES: Ungelesene Details:", unreadMessages);
        }


        // ✅ NEU: Prüfe ob ungelesene Request dabei ist
        const hasUnreadRequest = (unreadMessages || []).some(
          m => m.message_type === 'request' && !m.read
        );


        chatPreviews.push({
          chatId,
          partnerId: partner.id,
          partnerName: partner.name,
          partnerSurname: partner.surname,
          partnerPicture: partner.picture,
          lastMessage: lastMsg?.content || "Noch keine Nachrichten",
          lastMessageTime: lastMsg?.created_at || new Date().toISOString(),
          lastMessageType: lastMsg?.message_type, // ✅ NEU
          unreadCount: unreadCount,
          hasUnreadRequest: hasUnreadRequest, // ✅ NEU
          partnerTrustlevel: partner.trustlevel,

        });


        console.log(`✅ MESSAGES: Chat ${chatId} Preview erstellt - Unread Count:`, unreadCount);
      }


      chatPreviews.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );


      console.log("📊 MESSAGES: Insgesamt", chatPreviews.length, "Chats geladen");
      console.log("📬 MESSAGES: Total ungelesene Nachrichten:", totalUnreadCount);
      console.log("📋 MESSAGES: Chat Previews:", chatPreviews);


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
      console.log("🎯 MESSAGES: NEUE chatPreviews:", JSON.stringify(chatPreviews));
      console.log("🎯 MESSAGES: NEUE filtered:", JSON.stringify(filtered));
      console.log("🎯 MESSAGES: ALTE chats() VOR batch:", JSON.stringify(chats()));
      console.log("🎯 MESSAGES: ALTE filteredChats() VOR batch:", JSON.stringify(filteredChats()));
      
      batch(() => {
        setChats([...chatPreviews]);
        setFilteredChats([...filtered]);
        setDirectMessageCount(totalUnreadCount);
      });


      console.log("🎯 MESSAGES: NEUE chats() NACH batch:", JSON.stringify(chats()));
      console.log("🎯 MESSAGES: NEUE filteredChats() NACH batch:", JSON.stringify(filteredChats()));
      console.log("🔢 MESSAGES: Badge Count gesetzt auf:", totalUnreadCount);
      console.log("👁️ MESSAGES: Sichtbare Chats:", filtered.length);
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
