import { createSignal, createEffect, For, Show, onCleanup, onMount } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";



interface ChatPreview {
  chatId: number;
  partnerId: number;
  partnerName: string;
  partnerSurname: string;
  partnerPicture: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}


// ✅ Globaler Channel für Realtime
let globalMessagesChannel: any = null;
let reloadTimeout: any = null;



export default function Messages() {
  const navigate = useNavigate();


  const [chats, setChats] = createSignal<ChatPreview[]>([]);
  const [filteredChats, setFilteredChats] = createSignal<ChatPreview[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);



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
        
        // ✅ Setup Realtime nur einmal
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


  // ✅ Cleanup beim Unmount
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
          filter: `message_type=eq.direct`,
        },
        (payload) => {
          console.log("🔔 Messages: INSERT Event - Neue Nachricht");
          // Sofort neu laden bei neuen Nachrichten
          loadChats(userId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Messages",
          filter: `message_type=eq.direct`,
        },
        (payload) => {
          console.log("🔔 Messages: UPDATE Event - Read status geändert");
          
          // ✅ Verzögert neu laden bei Updates (read flag)
          if (reloadTimeout) clearTimeout(reloadTimeout);
          reloadTimeout = setTimeout(() => {
            console.log("🔄 Reloading chats nach UPDATE...");
            loadChats(userId);
          }, 500);
        }
      )
      .subscribe((status) => {
        console.log("📡 Messages Channel Status:", status);
      });
  };



  const loadChats = async (userId: number) => {
    try {
      console.log("📥 Loading chats for user:", userId);
      
      // Hole alle Chats wo der User Teilnehmer ist
      const { data: userChats, error: chatsError } = await supabase
        .from("Chat_Participants")
        .select("chat_id")
        .eq("user_id", userId);


      if (chatsError) throw chatsError;


      if (!userChats || userChats.length === 0) {
        setChats([]);
        setFilteredChats([]);
        return;
      }


      const chatIds = userChats.map(c => c.chat_id);


      // Hole alle Chat-Details
      const { data: allChatDetails } = await supabase
        .from("Chats")
        .select("id, product_id")
        .in("id", chatIds);


      // Filtere Direct Chats (product_id = null)
      const chatDetails = (allChatDetails || []).filter(c => c.product_id === null);


      if (chatDetails.length === 0) {
        setChats([]);
        setFilteredChats([]);
        return;
      }


      const directChatIds = chatDetails.map(c => c.id);


      // Für jeden Chat: Hole Chat-Partner und letzte Nachricht
      const chatPreviews: ChatPreview[] = [];


      for (const chatId of directChatIds) {
        // Hole Chat-Partner (anderer User im Chat)
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


        if (!participants || participants.length === 0) continue;


        const partner = participants[0].User as any;


        // Hole letzte Nachricht
        const { data: lastMsg } = await supabase
          .from("Messages")
          .select("content, created_at")
          .eq("chat_id", chatId)
          .eq("message_type", "direct")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();


        // ✅ Zähle nur UNGELESENE Nachrichten die AN MICH gerichtet sind
        const { data: unreadMessages } = await supabase
          .from("Messages")
          .select("id")
          .eq("chat_id", chatId)
          .eq("message_type", "direct")
          .eq("receiver_id", userId)
          .eq("read", false);


        chatPreviews.push({
          chatId,
          partnerId: partner.id,
          partnerName: partner.name,
          partnerSurname: partner.surname,
          partnerPicture: partner.picture,
          lastMessage: lastMsg?.content || "Noch keine Nachrichten",
          lastMessageTime: lastMsg?.created_at || new Date().toISOString(),
          unreadCount: (unreadMessages || []).length,
        });
      }


      // Sortiere nach letzter Nachricht (neueste zuerst)
      chatPreviews.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );


      setChats(chatPreviews);
      
      // Aktualisiere gefilterte Liste nur wenn kein Suchbegriff
      if (!searchQuery()) {
        setFilteredChats(chatPreviews);
      } else {
        // Wende aktuellen Filter an
        applySearchFilter(chatPreviews, searchQuery());
      }
      
      console.log("✅ Loaded", chatPreviews.length, "chats");
    } catch (err) {
      console.error("Error loading chats:", err);
    }
  };



  // ✅ Separate Filter-Funktion
  const applySearchFilter = (chatList: ChatPreview[], query: string) => {
    const lowerQuery = query.toLowerCase();
    
    if (!lowerQuery) {
      setFilteredChats(chatList);
      return;
    }


    const filtered = chatList.filter((chat) =>
      `${chat.partnerName} ${chat.partnerSurname}`.toLowerCase().includes(lowerQuery) ||
      chat.lastMessage.toLowerCase().includes(lowerQuery)
    );


    setFilteredChats(filtered);
  };



  // Such-Filter mit createEffect
  createEffect(() => {
    const query = searchQuery();
    applySearchFilter(chats(), query);
  });



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



  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header class="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md">
        <div class="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <A href="/home" class="text-2xl font-bold text-sky-600 dark:text-sky-400">
            Critico
          </A>
          <div class="flex-1" />
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
            Nachrichten
          </h1>
        </div>
      </header>


      <main class="max-w-5xl mx-auto px-4 py-6">
        {/* Suchleiste */}
        <div class="mb-6">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Chats durchsuchen..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>


        {/* Loading */}
        <Show when={loading()}>
          <div class="flex justify-center items-center py-20">
            <div class="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </Show>


        {/* Chats Liste */}
        <Show when={!loading()}>
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <Show when={filteredChats().length === 0} fallback={
              <For each={filteredChats()}>
                {(chat, index) => (
                  <>
                    <A
                      href={`/chat/${chat.partnerId}`}
                      class="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      {/* Avatar */}
                      <div class="relative flex-shrink-0">
                        <div class="w-14 h-14 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {chat.partnerName.charAt(0)}{chat.partnerSurname.charAt(0)}
                        </div>
                        <Show when={chat.unreadCount > 0}>
                          <div class="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                            {chat.unreadCount}
                          </div>
                        </Show>
                      </div>


                      {/* Chat Info */}
                      <div class="flex-1 min-w-0">
                        <div class="flex items-baseline justify-between mb-1">
                          <h3 class="font-semibold text-gray-900 dark:text-white truncate">
                            {chat.partnerName} {chat.partnerSurname}
                          </h3>
                          <span class="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                            {formatTime(chat.lastMessageTime)}
                          </span>
                        </div>
                        <p class={`text-sm truncate ${
                          chat.unreadCount > 0
                            ? "text-gray-900 dark:text-white font-medium"
                            : "text-gray-600 dark:text-gray-400"
                        }`}>
                          {chat.lastMessage}
                        </p>
                      </div>


                      {/* Chevron */}
                      <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </A>
                    <Show when={index() < filteredChats().length - 1}>
                      <div class="border-t border-gray-200 dark:border-gray-700 mx-4" />
                    </Show>
                  </>
                )}
              </For>
            }>
              {/* Keine Chats */}
              <div class="text-center py-20 px-4">
                <svg class="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {searchQuery() ? "Keine Ergebnisse gefunden" : "Noch keine Chats"}
                </h3>
                <p class="text-gray-600 dark:text-gray-400 mb-6">
                  {searchQuery() 
                    ? "Versuche es mit einem anderen Suchbegriff"
                    : "Kontaktiere Produktbesitzer, um Unterhaltungen zu starten"
                  }
                </p>
                <Show when={!searchQuery()}>
                  <A
                    href="/home"
                    class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Zur Startseite
                  </A>
                </Show>
              </div>
            </Show>
          </div>
        </Show>
      </main>
    </div>
  );
}
