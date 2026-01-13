import { createSignal, For, Show, onCleanup, onMount, createEffect } from "solid-js";
import { useParams, A, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";

interface Message {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  read: boolean;
  User: {
    id: number;
    name: string;
    surname: string;
    picture: string | null;
  };
}

interface ChatPartner {
  id: number;
  name: string;
  surname: string;
  picture: string | null;
}

// ✅ Globale Variable außerhalb der Component
let globalChannel: any = null;
let globalChatId: number | null = null;

export default function Chat() {
  const params = useParams();
  const navigate = useNavigate();
  
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [newMessage, setNewMessage] = createSignal("");
  const [chatPartner, setChatPartner] = createSignal<ChatPartner | null>(null);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);
  const [chatId, setChatId] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [sending, setSending] = createSignal(false);

  // ✅ Ref für Main Container
  let mainContainerRef: HTMLElement | undefined;
  // ✅ Ref für Messages Container (inneres div)
  let messagesEndRef: HTMLDivElement | undefined;

 const scrollToBottom = () => {
  if (mainContainerRef) {
    mainContainerRef.scrollTop = mainContainerRef.scrollHeight;
  }
};



  // ✅ createEffect mit Debug-Logs
  createEffect(() => {
    const msgs = messages();
    const isLoading = loading();
    
    console.log("🔄 createEffect triggered - Messages:", msgs.length, "Loading:", isLoading);
    
    if (!isLoading && msgs.length > 0) {
      console.log("✅ Bedingung erfüllt, scrolle nach unten");
      
      // Sofort scrollen
      setTimeout(() => scrollToBottom(), 0);
      // Und nochmal zur Sicherheit
      setTimeout(() => scrollToBottom(), 100);
      setTimeout(() => scrollToBottom(), 300);
    } else {
      console.log("⏭️ Bedingung nicht erfüllt");
    }
  });

  onMount(async () => {
    console.log("🚀 Component mounted");
    
    if (!isLoggedIn() || !sessionStore.user) {
      navigate("/login");
      return;
    }

    try {
      // Lade aktuellen User
      const { data: userData } = await supabase
        .from("User")
        .select("id")
        .eq("auth_id", sessionStore.user.id)
        .single();

      if (!userData) {
        console.error("User nicht gefunden");
        return;
      }

      const userId = userData.id;
      setCurrentUserId(userId);
      console.log("👤 Current User ID:", userId);

      const partnerId = Number(params.partnerId);
      if (!partnerId) {
        console.error("Keine Partner ID");
        return;
      }

      setLoading(true);

      // Hole Chat Partner Info
      const { data: partnerData } = await supabase
        .from("User")
        .select("id, name, surname, picture")
        .eq("id", partnerId)
        .single();

      if (partnerData) {
        setChatPartner(partnerData);
        console.log("👥 Chat Partner:", partnerData.name);
      }

      // Hole oder erstelle Direct Chat
      const { data: chatData, error: chatError } = await supabase
        .rpc("get_or_create_direct_chat", {
          user1_id: userId,
          user2_id: partnerId
        });

      if (chatError) throw chatError;
      
      const directChatId = chatData as number;
      setChatId(directChatId);
      console.log("💬 Chat ID:", directChatId);

      // Lade Messages
      await loadMessages(directChatId, userId);

      // ✅ Prüfe ob bereits ein Channel für diesen Chat existiert
      if (globalChannel && globalChatId === directChatId) {
        console.log("♻️ Channel existiert bereits, wird wiederverwendet");
        return;
      }

      // ✅ Entferne alten Channel falls vorhanden
      if (globalChannel) {
        console.log("🗑️ Entferne alten Channel");
        await supabase.removeChannel(globalChannel);
        globalChannel = null;
      }

      // Realtime Subscription
      console.log("🔌 Setting up Realtime subscription for chat:", directChatId);

      globalChannel = supabase
        .channel('any-messages-' + Date.now())
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "Messages",
          },
          (payload) => {
            console.log("🔔🔔🔔 EVENT EMPFANGEN:", payload.eventType);
            
            if (payload.eventType === "INSERT") {
              console.log("✅ INSERT Event!");
              console.log("Chat ID:", payload.new.chat_id);
              console.log("Message Type:", payload.new.message_type);
              console.log("Sender ID:", payload.new.sender_id);
              
              if (payload.new.chat_id === directChatId && payload.new.message_type === "direct") {
                console.log("🎯 Richtige Nachricht für diesen Chat!");
              
                if (payload.new.sender_id === userId) {
                  console.log("⏭️ Eigene Nachricht, wird ignoriert");
                  return;
                }

                // Hole die vollständige Nachricht
                supabase
                  .from("Messages")
                  .select(`
                    id,
                    content,
                    created_at,
                    sender_id,
                    read,
                    User!Messages_sender_id_fkey (
                      id,
                      name,
                      surname,
                      picture
                    )
                  `)
                  .eq("id", payload.new.id)
                  .single()
                  .then(({ data: newMsg }) => {
                    if (newMsg) {
                      console.log("📨 Nachricht geladen:", newMsg);
                      setMessages(prev => [...prev, newMsg as any]);
                      
                      // Markiere als gelesen wenn an mich
                      if (newMsg.sender_id !== userId && !newMsg.read) {
                        supabase
                          .from("Messages")
                          .update({ read: true })
                          .eq("id", newMsg.id)
                          .then(() => {
                            setMessages(prev => 
                              prev.map(msg => 
                                msg.id === newMsg.id ? { ...msg, read: true } : msg
                              )
                            );
                            console.log("✅ Nachricht als gelesen markiert");
                          });
                      }
                    }
                  });
              } else {
                console.log("⏭️ Event ist für anderen Chat oder Typ");
              }
            }
          }
        )
        .subscribe((status, err) => {
          console.log("📡 Channel Status:", status);
          if (err) {
            console.error("❌ Subscribe Error:", err);
          }
        });

      globalChatId = directChatId;

    } catch (err) {
      console.error("Error loading chat:", err);
    } finally {
      setLoading(false);
      console.log("🏁 Loading finished");
    }
  });

  onCleanup(() => {
    console.log("🧹 Cleanup aufgerufen - Component wird unmounted");
  });

  const loadMessages = async (chatId: number, userId: number) => {
    try {
      const { data, error } = await supabase
        .from("Messages")
        .select(`
          id,
          content,
          created_at,
          sender_id,
          read,
          User!Messages_sender_id_fkey (
            id,
            name,
            surname,
            picture
          )
        `)
        .eq("chat_id", chatId)
        .eq("message_type", "direct")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      console.log("📥 Loaded messages:", data?.length || 0);
      setMessages((data || []) as any);

      // Markiere ungelesene Nachrichten als gelesen
      const unreadIds = (data || [])
        .filter(m => m.sender_id !== userId && !m.read)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("Messages")
          .update({ read: true })
          .in("id", unreadIds);
        
        setMessages(prev => 
          prev.map(msg => 
            unreadIds.includes(msg.id) ? { ...msg, read: true } : msg
          )
        );
        
        console.log(`✅ ${unreadIds.length} Nachrichten als gelesen markiert`);
      }
    } catch (err) {
      console.error("Error in loadMessages:", err);
    }
  };

  const handleSendMessage = async (e: Event) => {
    e.preventDefault();

    if (!newMessage().trim() || !currentUserId() || !chatId()) return;

    setSending(true);
    console.log("📤 Sende Nachricht...");

    try {
      const partnerId = Number(params.partnerId);

      const { data, error } = await supabase
        .from("Messages")
        .insert({
          content: newMessage(),
          sender_id: currentUserId()!,
          receiver_id: partnerId,
          chat_id: chatId()!,
          message_type: "direct",
          read: false,
          created_at: new Date().toISOString(),
        })
        .select(`
          id,
          content,
          created_at,
          sender_id,
          read,
          User!Messages_sender_id_fkey (
            id,
            name,
            surname,
            picture
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        console.log("✅ Nachricht gesendet:", data.id);
        setMessages(prev => [...prev, data as any]);
      }

      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Fehler beim Senden der Nachricht");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
  <div class="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
    {/* Header - Fixe Höhe */}
    <header class="bg-white dark:bg-gray-800 shadow-md flex-shrink-0">
      <div class="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <Show when={chatPartner()}>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
              {chatPartner()!.name.charAt(0)}{chatPartner()!.surname.charAt(0)}
            </div>
            <div>
              <h1 class="font-semibold text-gray-900 dark:text-white">
                {chatPartner()!.name} {chatPartner()!.surname}
              </h1>
            </div>
          </div>
        </Show>
      </div>
    </header>

    {/* Messages Container - Nimmt restlichen Platz */}
    <main ref={mainContainerRef} class="flex-1 overflow-y-auto">
      <Show when={loading()}>
        <div class="flex h-full items-center justify-center">
          <div class="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Show>

      <Show when={!loading()}>
        <div class="px-4 py-6 space-y-4 max-w-5xl mx-auto w-full">
          <Show when={messages().length === 0}>
            <div class="text-center py-12">
              <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p class="text-gray-500 dark:text-gray-400">
                Noch keine Nachrichten. Starte die Unterhaltung!
              </p>
            </div>
          </Show>

          <For each={messages()}>
            {(message) => {
              const isOwn = message.sender_id === currentUserId();
              return (
                <div class={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div class={`flex gap-2 max-w-[70%] ${isOwn ? "flex-row-reverse" : ""}`}>
                    <div class="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                      {message.User.name.charAt(0)}
                    </div>
                    <div>
                      <div class={`px-4 py-2 rounded-2xl shadow-md ${
                        isOwn
                          ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white"
                          : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      }`}>
                        <p class="break-words">{message.content}</p>
                      </div>
                      <p class={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${isOwn ? "text-right" : ""}`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </main>

    {/* Input Form - Fixe Höhe am Ende */}
    <Show when={!loading()}>
      <footer class="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4 flex-shrink-0">
        <form onSubmit={handleSendMessage} class="max-w-5xl mx-auto flex gap-3">
          <input
            type="text"
            value={newMessage()}
            onInput={(e) => setNewMessage(e.currentTarget.value)}
            placeholder="Nachricht schreiben..."
            class="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            disabled={sending()}
          />
          <button
            type="submit"
            disabled={!newMessage().trim() || sending()}
            class="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Senden
          </button>
        </form>
      </footer>
    </Show>
  </div>
);
}